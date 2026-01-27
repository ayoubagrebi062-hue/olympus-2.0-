# 50X AGENT UPGRADE PLAN

## Problem Statement
Current agents produce "generic AI output" - basic code that works but lacks:
- Brand identity
- Visual polish
- Animations
- Typography hierarchy
- Marketing quality
- 50X differentiation

## Root Cause Analysis

### Current Agent Prompts Are Missing:

| Missing Element | Impact |
|----------------|--------|
| Design tokens | Agents use random colors/spacing |
| Visual examples | No reference for "good" output |
| Brand guidelines | Generic look every time |
| Animation specs | Static, lifeless UIs |
| Typography scale | Random font sizes |
| Quality gates | No design validation |

### Agent Structure Problems:

1. **POLISH is optional** → Animations rarely run
2. **No BRAND agent** → No design enforcement
3. **No MARKETING agent** → Weak copy/persuasion
4. **No VISUAL QA agent** → No design review

---

## UPGRADE REQUIREMENTS

### REQUIREMENT 1: Design System Injection

Every frontend agent needs this context:

```typescript
const OLYMPUS_DESIGN_SYSTEM = {
  // COLORS - Exact values, no ambiguity
  colors: {
    background: {
      primary: '#0a0a0a',
      secondary: '#0d0d0d',
      tertiary: '#141414',
    },
    text: {
      primary: 'rgba(255,255,255,1)',
      secondary: 'rgba(255,255,255,0.6)',
      muted: 'rgba(255,255,255,0.4)',
    },
    brand: {
      primary: '#7c3aed',      // violet-600
      primaryHover: '#6d28d9', // violet-700
      accent: '#8b5cf6',       // violet-500
      gradient: 'from-violet-600 via-purple-600 to-blue-600',
    },
    border: {
      default: 'rgba(255,255,255,0.1)',
      hover: 'rgba(255,255,255,0.2)',
    }
  },

  // TYPOGRAPHY - Complete scale
  typography: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    scale: {
      hero: 'text-7xl font-bold tracking-tight',      // 72px
      h1: 'text-5xl font-bold tracking-tight',        // 48px
      h2: 'text-4xl font-bold',                       // 36px
      h3: 'text-2xl font-semibold',                   // 24px
      h4: 'text-xl font-semibold',                    // 20px
      body: 'text-base',                              // 16px
      small: 'text-sm',                               // 14px
      tiny: 'text-xs',                                // 12px
    },
    weights: {
      normal: 'font-normal',    // 400
      medium: 'font-medium',    // 500
      semibold: 'font-semibold', // 600
      bold: 'font-bold',        // 700
    }
  },

  // SPACING - 4px base system
  spacing: {
    base: 4,  // 4px
    scale: [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64],
    // gap-1=4px, gap-2=8px, gap-3=12px, gap-4=16px, etc.
  },

  // EFFECTS
  effects: {
    glassmorphism: 'bg-white/[0.03] backdrop-blur-xl border border-white/10',
    glow: 'shadow-[0_0_50px_rgba(124,58,237,0.3)]',
    gradient: {
      text: 'bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent',
      background: 'bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-transparent',
    },
    blur: {
      sm: 'blur-[50px]',
      md: 'blur-[100px]',
      lg: 'blur-[150px]',
    }
  },

  // ANIMATIONS - Required for 50X
  animations: {
    fadeIn: 'animate-in fade-in duration-500',
    slideUp: 'animate-in slide-in-from-bottom-4 duration-500',
    scaleIn: 'animate-in zoom-in-95 duration-300',
    hover: {
      lift: 'hover:-translate-y-1 transition-transform duration-200',
      glow: 'hover:shadow-[0_0_30px_rgba(124,58,237,0.4)] transition-shadow duration-300',
      scale: 'hover:scale-105 transition-transform duration-200',
    },
    loading: 'animate-pulse',
    spin: 'animate-spin',
  },

  // COMPONENTS - Standard patterns
  components: {
    card: 'bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl',
    button: {
      primary: 'bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-all',
      secondary: 'bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-all',
      ghost: 'hover:bg-white/5 text-white/60 hover:text-white transition-all',
    },
    input: 'bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-violet-500/50',
    badge: 'px-3 py-1 bg-violet-500/20 border border-violet-500/30 rounded-full text-violet-300 text-sm',
  },

  // LAYOUT
  layout: {
    maxWidth: 'max-w-7xl mx-auto',
    section: 'py-20 px-4',
    header: 'h-16 fixed top-0 left-0 right-0 z-50',
  }
};
```

### REQUIREMENT 2: Visual Examples in Prompts

Agents need BEFORE/AFTER examples:

```
❌ BAD (Generic AI):
<button className="bg-blue-500 text-white px-4 py-2">
  Click me
</button>

✅ GOOD (50X Quality):
<button className="
  bg-gradient-to-r from-violet-600 to-purple-600
  hover:from-violet-500 hover:to-purple-500
  text-white font-medium px-6 py-3 rounded-xl
  shadow-lg shadow-violet-500/25
  hover:shadow-xl hover:shadow-violet-500/30
  hover:-translate-y-0.5
  transition-all duration-200
  flex items-center gap-2
">
  <span>Start Building</span>
  <ArrowRight className="w-5 h-5" />
</button>
```

### REQUIREMENT 3: New Agent Structure

```
CURRENT (Broken):
├── PIXEL (functionality-focused)
├── WIRE (routes-focused)
└── POLISH (optional, skipped)

UPGRADED (50X):
├── PALETTE (design system setup) ← NEW
├── BLOCKS (component library with design)
├── PIXEL (implement with design tokens) ← UPGRADED
├── WIRE (pages with visual quality) ← UPGRADED
├── POLISH (animations) ← REQUIRED, not optional
├── BRAND (enforce design consistency) ← NEW
└── MARKETING (copy, persuasion, social proof) ← NEW
```

### REQUIREMENT 4: Quality Gates for Design

```typescript
const DESIGN_QUALITY_GATES = {
  // Must use brand colors
  brandColors: {
    required: ['violet-600', 'violet-500', '#7c3aed'],
    forbidden: ['blue-500', 'blue-600'], // Generic AI colors
  },

  // Must have animations
  animations: {
    minimumCount: 5,
    required: ['hover', 'transition', 'animate-'],
  },

  // Typography hierarchy
  typography: {
    mustHave: ['text-7xl', 'text-5xl', 'text-2xl'],
    forbidden: ['text-md'], // Not a real class
  },

  // Effects
  effects: {
    required: ['backdrop-blur', 'gradient', 'shadow'],
  }
};
```

---

## IMPLEMENTATION PLAN

### Phase 1: Design System File (Day 1)
Create `/src/lib/design-system.ts` with all tokens

### Phase 2: Upgrade Agent Prompts (Day 1-2)

#### PIXEL Upgrade:
```diff
- "Implement pixel-perfect components"
+ "Implement STUNNING components using OLYMPUS design system.

+ MANDATORY DESIGN REQUIREMENTS:
+ 1. Use ONLY brand colors from design system
+ 2. Apply glassmorphism to cards: bg-white/[0.03] backdrop-blur-xl
+ 3. Add hover animations to ALL interactive elements
+ 4. Use gradient text for headlines
+ 5. Include shadows with brand color: shadow-violet-500/25

+ FORBIDDEN:
+ - bg-blue-500 (generic)
+ - Plain borders without transparency
+ - Static buttons without hover states
+ - Missing transitions

+ EVERY COMPONENT MUST HAVE:
+ □ Hover state with visual feedback
+ □ Transition animation (duration-200 minimum)
+ □ Brand colors (violet/purple palette)
+ □ Proper spacing (gap-2 minimum between elements)
+ □ Focus states for accessibility
"
```

#### WIRE Upgrade:
```diff
- "Compose components into pages"
+ "Create VISUALLY STUNNING pages that convert users.

+ MANDATORY PAGE ELEMENTS:
+ 1. Hero section with gradient background blurs
+ 2. Animated entrance for above-fold content
+ 3. Social proof section
+ 4. Feature grid with hover effects
+ 5. CTA sections with urgency
+ 6. Footer with all links

+ LAYOUT REQUIREMENTS:
+ - Background: #0a0a0a
+ - Floating gradient orbs (purple/violet blurs)
+ - Glassmorphic cards
+ - Proper section spacing (py-20)
+ - Max-width containers (max-w-7xl)

+ EVERY PAGE MUST HAVE:
+ □ Meta tags for SEO
+ □ Loading states
+ □ Error boundaries
+ □ Animations on scroll
+ □ Mobile responsive design
"
```

#### POLISH Upgrade:
```diff
- optional: true
+ optional: false  // REQUIRED!

- "Add life to interfaces"
+ "Add PREMIUM animations that differentiate from generic AI.

+ REQUIRED ANIMATIONS:
+ 1. Page load: Staggered fade-in for sections
+ 2. Scroll: Elements animate in as they enter viewport
+ 3. Hover: All buttons/cards lift and glow
+ 4. Click: Subtle scale feedback
+ 5. Loading: Skeleton screens with shimmer
+ 6. Transitions: Page transitions with fade

+ ANIMATION SPECS:
+ - Duration: 200-500ms (never instant, never slow)
+ - Easing: ease-out for enters, ease-in for exits
+ - Stagger: 50-100ms between sibling elements

+ USE THESE PATTERNS:
+ - Framer Motion for complex sequences
+ - CSS transitions for simple hovers
+ - Intersection Observer for scroll triggers
+ - prefers-reduced-motion respect
"
```

### Phase 3: New Agents (Day 2-3)

#### BRAND Agent (New):
```typescript
{
  id: 'brand',
  name: 'BRAND',
  description: 'Enforce design consistency across all outputs',
  phase: 'frontend',
  tier: 'sonnet',
  dependencies: ['pixel', 'wire', 'polish'],
  optional: false,
  systemPrompt: `You are BRAND, the design guardian.

Your job: Review ALL generated code and ensure design consistency.

CHECK FOR:
1. Color usage - ONLY brand colors allowed
2. Typography - Correct scale used
3. Spacing - Consistent gap/padding
4. Animations - Present on all interactive elements
5. Effects - Glassmorphism, gradients, shadows

OUTPUT:
- List of violations
- Fixed code snippets
- Design score (0-100)

REJECT builds with score < 80.`
}
```

#### MARKETING Agent (New):
```typescript
{
  id: 'marketing',
  name: 'MARKETING',
  description: 'Create compelling copy and social proof',
  phase: 'frontend',
  tier: 'sonnet',
  dependencies: ['wire'],
  optional: false,
  systemPrompt: `You are MARKETING, the conversion specialist.

Your job: Write copy that CONVERTS.

REQUIREMENTS:
1. Headlines that grab attention
2. Subheadlines that explain value
3. CTAs with urgency
4. Social proof (numbers, testimonials)
5. Feature descriptions that sell benefits

PATTERNS:
- "Build anything. 50X faster." (bold claim)
- "10,000+ apps built" (social proof)
- "No credit card required" (reduce friction)
- "Start building in 30 seconds" (speed promise)

OUTPUT: Updated copy for all pages.`
}
```

### Phase 4: Quality Gates (Day 3)

Add design validation to quality orchestrator:

```typescript
// In quality-orchestrator.ts
const designGates = {
  name: 'design',
  check: (files) => {
    const issues = [];

    for (const file of files) {
      // Check for generic colors
      if (file.content.includes('bg-blue-500')) {
        issues.push(`${file.path}: Uses generic blue-500, use violet-600`);
      }

      // Check for missing transitions
      if (file.content.includes('hover:') && !file.content.includes('transition')) {
        issues.push(`${file.path}: Has hover state but no transition`);
      }

      // Check for animations
      const hasAnimation = /animate-|transition-|duration-/.test(file.content);
      if (!hasAnimation && file.path.includes('component')) {
        issues.push(`${file.path}: Missing animations`);
      }
    }

    return { passed: issues.length === 0, issues };
  }
};
```

---

## FILES TO MODIFY

1. `/src/lib/agents/registry/frontend.ts` - Upgrade PIXEL, WIRE, POLISH prompts
2. `/src/lib/agents/registry/index.ts` - Add BRAND, MARKETING agents
3. `/src/lib/agents/orchestrator/quality-orchestrator.ts` - Add design gates
4. `/src/lib/design-system.ts` - Create design tokens file (NEW)
5. `/scripts/build-olympus-frontend.ts` - Update spec with design requirements

---

## SUCCESS CRITERIA

After upgrade, agent output MUST have:

| Element | Requirement |
|---------|-------------|
| Colors | Violet/purple palette, NO blue-500 |
| Typography | Hero (7xl), H1 (5xl), H2 (4xl), etc. |
| Animations | Hover + transitions on ALL interactive |
| Effects | Glassmorphism, gradients, shadows |
| Layout | Dark background, floating blurs |
| Copy | Compelling headlines, social proof |
| Pages | ALL links work, no 404s |

---

## ESTIMATED EFFORT

| Phase | Time | Files |
|-------|------|-------|
| Design System | 2 hours | 1 |
| Agent Prompts | 4 hours | 2 |
| New Agents | 3 hours | 2 |
| Quality Gates | 2 hours | 1 |
| Testing | 3 hours | - |
| **TOTAL** | **14 hours** | **6** |

---

## NEXT STEP

Approve this plan, then I will:
1. Create the design system file
2. Upgrade agent prompts one by one
3. Add new agents
4. Add quality gates
5. Re-run build and verify 50X quality

**Ready to execute?**

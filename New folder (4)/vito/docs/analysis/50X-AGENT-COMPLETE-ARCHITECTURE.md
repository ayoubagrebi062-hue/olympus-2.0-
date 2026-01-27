# 50X AGENT COMPLETE ARCHITECTURE
## The Blueprint for World-Class Code Generation Agents

**Version:** 2.0 APEX-APPROVED
**Status:** COMPLETE SPECIFICATION
**Estimated Effort:** 52 hours
**Goal:** Build agents that produce output INDISTINGUISHABLE from senior human developers

---

## EXECUTIVE SUMMARY

Current agents fail because they:
1. Have no visual reference (text prompts for visual output)
2. Have no examples to learn from (zero-shot generation)
3. Can't see their own output (no validation loop)
4. Don't plan before coding (no reasoning)
5. Can't iterate (one-shot, take it or leave it)

This architecture fixes ALL of these with:
- **RAG System** - 1000+ component examples
- **Vision Pipeline** - See and compare output
- **Few-Shot Prompts** - Learn from examples
- **Chain-of-Thought** - Plan before coding
- **Iteration Loop** - Retry until quality threshold

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         50X AGENT ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ════════════════════════ INPUT LAYER ════════════════════════              │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │    USER      │  │   VISION     │  │     RAG      │  │   MEMORY     │    │
│  │   REQUEST    │  │   INPUTS     │  │  RETRIEVAL   │  │   CONTEXT    │    │
│  │              │  │              │  │              │  │              │    │
│  │ "Build a    │  │ • Figma PNG  │  │ • Similar    │  │ • Past       │    │
│  │  landing    │  │ • Reference  │  │   components │  │   builds     │    │
│  │  page..."   │  │   screenshots│  │ • Good code  │  │ • Decisions  │    │
│  │              │  │ • Competitor │  │   examples   │  │ • Patterns   │    │
│  │              │  │   sites      │  │              │  │              │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │                 │             │
│         └─────────────────┴────────┬────────┴─────────────────┘             │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      CONTEXT ASSEMBLER                                │  │
│  │                                                                        │  │
│  │  • Combines all inputs into optimized prompt                          │  │
│  │  • Selects best few-shot examples via similarity                      │  │
│  │  • Injects design system tokens                                       │  │
│  │  • Manages token budget (max 8K context per agent)                    │  │
│  │  • Formats vision inputs as base64                                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│  ════════════════════════ AGENT LAYER ════════════════════════             │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        AGENT PIPELINE                                 │  │
│  │                                                                        │  │
│  │  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐ │  │
│  │  │ PLANNER │ → │ DESIGNER│ → │  CODER  │ → │ REVIEWER│ → │  FIXER  │ │  │
│  │  │         │   │         │   │         │   │         │   │         │ │  │
│  │  │ Think   │   │ Visual  │   │ Generate│   │ Critique│   │ Improve │ │  │
│  │  │ & Plan  │   │ Design  │   │  Code   │   │ Output  │   │  Code   │ │  │
│  │  └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘ │  │
│  │       │             │             │             │             │       │  │
│  │       ▼             ▼             ▼             ▼             ▼       │  │
│  │  [Analysis]   [Spec Doc]     [Code]      [Issues]      [Fixed]       │  │
│  │                                                                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│  ════════════════════════ VALIDATION LAYER ════════════════════════        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      VALIDATION PIPELINE                              │  │
│  │                                                                        │  │
│  │  SYNTAX     RENDER      SCREENSHOT    VISION       SCORE              │  │
│  │  CHECK  →  COMPONENT →  CAPTURE   →  COMPARE  →  CALCULATE            │  │
│  │    │          │            │            │            │                │  │
│  │    ▼          ▼            ▼            ▼            ▼                │  │
│  │  [Parse]   [Browser]    [PNG]      [AI Judge]   [0-100]               │  │
│  │                                                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │  IF score >= 85: ✅ APPROVE → Output to filesystem               │ │  │
│  │  │  IF score < 85:  🔄 RETRY  → Send feedback to FIXER (max 3x)    │ │  │
│  │  │  IF 3 retries fail: ⚠️ FLAG → Human review required              │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ════════════════════════ OUTPUT LAYER ════════════════════════            │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                       OUTPUT MANAGER                                  │  │
│  │                                                                        │  │
│  │  • Write files to filesystem                                          │  │
│  │  • Update RAG database with new good examples                         │  │
│  │  • Log decisions to memory                                            │  │
│  │  • Generate build report                                              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART 1: RAG SYSTEM (Component Library)

## Purpose
Give agents access to 1000+ high-quality component examples that they can reference when generating code.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    RAG COMPONENT LIBRARY                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐     ┌─────────────────┐                    │
│  │  COMPONENT      │     │    QDRANT       │                    │
│  │  COLLECTION     │ ──► │  VECTOR DB      │                    │
│  │                 │     │                 │                    │
│  │  • 500 buttons  │     │  • Embeddings   │                    │
│  │  • 300 cards    │     │  • Metadata     │                    │
│  │  • 200 forms    │     │  • Search       │                    │
│  │  • 150 navbars  │     │                 │                    │
│  │  • 100 heroes   │     └────────┬────────┘                    │
│  │  • 100 footers  │              │                             │
│  │  • 50 modals    │              ▼                             │
│  │  • etc.         │     ┌─────────────────┐                    │
│  └─────────────────┘     │   RETRIEVER     │                    │
│                          │                 │                    │
│                          │  Query: "dark   │                    │
│                          │  mode button    │                    │
│                          │  with gradient" │                    │
│                          │                 │                    │
│                          │  Returns: Top 5 │                    │
│                          │  matching       │                    │
│                          │  components     │                    │
│                          └─────────────────┘                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation

### File: `/src/lib/agents/rag/component-store.ts`

```typescript
import { QdrantClient } from '@qdrant/js-client-rest';

interface ComponentExample {
  id: string;
  name: string;
  category: 'button' | 'card' | 'form' | 'navbar' | 'hero' | 'footer' | 'modal' | 'input' | 'table';
  description: string;
  code: string;
  tags: string[];
  quality_score: number;  // 0-100, only store >= 85
  screenshot_url?: string;
  created_at: Date;
}

export class ComponentStore {
  private client: QdrantClient;
  private collectionName = 'olympus_components';

  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
    });
  }

  /**
   * Initialize collection with proper schema
   */
  async initialize(): Promise<void> {
    const exists = await this.client.collectionExists(this.collectionName);

    if (!exists) {
      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: 1536,  // OpenAI embedding size
          distance: 'Cosine',
        },
      });
    }
  }

  /**
   * Add a component to the library
   */
  async addComponent(component: ComponentExample, embedding: number[]): Promise<void> {
    await this.client.upsert(this.collectionName, {
      wait: true,
      points: [{
        id: component.id,
        vector: embedding,
        payload: {
          name: component.name,
          category: component.category,
          description: component.description,
          code: component.code,
          tags: component.tags,
          quality_score: component.quality_score,
          screenshot_url: component.screenshot_url,
          created_at: component.created_at.toISOString(),
        },
      }],
    });
  }

  /**
   * Search for similar components
   */
  async searchSimilar(
    queryEmbedding: number[],
    category?: string,
    limit: number = 5
  ): Promise<ComponentExample[]> {
    const filter = category ? {
      must: [{ key: 'category', match: { value: category } }],
    } : undefined;

    const results = await this.client.search(this.collectionName, {
      vector: queryEmbedding,
      filter,
      limit,
      with_payload: true,
    });

    return results.map(r => ({
      id: r.id as string,
      ...r.payload as any,
      created_at: new Date(r.payload?.created_at as string),
    }));
  }

  /**
   * Get components by category for few-shot examples
   */
  async getByCategory(category: string, limit: number = 5): Promise<ComponentExample[]> {
    const results = await this.client.scroll(this.collectionName, {
      filter: {
        must: [
          { key: 'category', match: { value: category } },
          { key: 'quality_score', range: { gte: 85 } },
        ],
      },
      limit,
      with_payload: true,
    });

    return results.points.map(r => ({
      id: r.id as string,
      ...r.payload as any,
      created_at: new Date(r.payload?.created_at as string),
    }));
  }
}
```

### File: `/src/lib/agents/rag/embedder.ts`

```typescript
import OpenAI from 'openai';

export class Embedder {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate embedding for text
   */
  async embed(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  }

  /**
   * Generate embedding for component (combines name, description, code)
   */
  async embedComponent(component: {
    name: string;
    description: string;
    code: string;
    tags: string[];
  }): Promise<number[]> {
    const text = `
Component: ${component.name}
Description: ${component.description}
Tags: ${component.tags.join(', ')}
Code Preview: ${component.code.slice(0, 500)}
    `.trim();

    return this.embed(text);
  }
}
```

### File: `/src/lib/agents/rag/retriever.ts`

```typescript
import { ComponentStore } from './component-store';
import { Embedder } from './embedder';

export class ComponentRetriever {
  private store: ComponentStore;
  private embedder: Embedder;

  constructor() {
    this.store = new ComponentStore();
    this.embedder = new Embedder();
  }

  /**
   * Retrieve relevant components for a generation task
   */
  async retrieve(query: string, options: {
    category?: string;
    limit?: number;
  } = {}): Promise<string[]> {
    const embedding = await this.embedder.embed(query);
    const components = await this.store.searchSimilar(
      embedding,
      options.category,
      options.limit || 5
    );

    // Format as few-shot examples
    return components.map(c => `
// EXAMPLE: ${c.name}
// Description: ${c.description}
// Quality Score: ${c.quality_score}/100
${c.code}
`);
  }

  /**
   * Get best examples for a component type
   */
  async getFewShotExamples(category: string, count: number = 3): Promise<string> {
    const components = await this.store.getByCategory(category, count);

    return components.map((c, i) => `
### EXAMPLE ${i + 1}: ${c.name}
\`\`\`tsx
${c.code}
\`\`\`
`).join('\n');
  }
}
```

## Seeding the RAG Database

### File: `/scripts/seed-component-library.ts`

```typescript
/**
 * Seed the component library with high-quality examples
 * Run: npx tsx scripts/seed-component-library.ts
 */

import { ComponentStore } from '../src/lib/agents/rag/component-store';
import { Embedder } from '../src/lib/agents/rag/embedder';

const SEED_COMPONENTS = [
  // ═══════════════════════════════════════════════════════════════
  // BUTTONS (50X Quality)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'PrimaryButton',
    category: 'button',
    description: 'Primary CTA button with gradient, hover lift, and glow effect',
    tags: ['primary', 'cta', 'gradient', 'hover', 'glow'],
    quality_score: 95,
    code: `'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const PrimaryButton = forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  ({ className, size = 'md', loading, children, disabled, ...props }, ref) => {
    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          // Base styles
          'relative inline-flex items-center justify-center gap-2',
          'font-semibold rounded-xl',
          'transition-all duration-200 ease-out',

          // Gradient background
          'bg-gradient-to-r from-violet-600 to-purple-600',
          'hover:from-violet-500 hover:to-purple-500',

          // Shadow and glow
          'shadow-lg shadow-violet-500/25',
          'hover:shadow-xl hover:shadow-violet-500/40',

          // Hover lift effect
          'hover:-translate-y-0.5',
          'active:translate-y-0',

          // Focus ring
          'focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0a]',

          // Disabled state
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',

          // Size
          sizes[size],

          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

PrimaryButton.displayName = 'PrimaryButton';`,
  },
  {
    name: 'GhostButton',
    category: 'button',
    description: 'Ghost button with subtle hover background',
    tags: ['ghost', 'subtle', 'hover', 'transparent'],
    quality_score: 92,
    code: `'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const GhostButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2',
        'px-4 py-2 rounded-lg',
        'text-white/60 hover:text-white',
        'hover:bg-white/5',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-white/20',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);

GhostButton.displayName = 'GhostButton';`,
  },

  // ═══════════════════════════════════════════════════════════════
  // CARDS (50X Quality)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'GlassCard',
    category: 'card',
    description: 'Glassmorphic card with blur, border, and hover glow',
    tags: ['glass', 'glassmorphism', 'blur', 'hover', 'glow'],
    quality_score: 96,
    code: `'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, hover = true, glow = false, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // Base glass effect
        'bg-white/[0.03] backdrop-blur-xl',
        'border border-white/10',
        'rounded-2xl p-6',

        // Hover effects
        hover && [
          'transition-all duration-300',
          'hover:bg-white/[0.05]',
          'hover:border-white/20',
          'hover:-translate-y-1',
        ],

        // Optional glow
        glow && 'hover:shadow-[0_0_40px_rgba(124,58,237,0.15)]',

        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

GlassCard.displayName = 'GlassCard';`,
  },
  {
    name: 'FeatureCard',
    category: 'card',
    description: 'Feature card with icon, title, description, and gradient border',
    tags: ['feature', 'icon', 'gradient', 'border'],
    quality_score: 94,
    code: `'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  gradient?: string;
  className?: string;
}

export function FeatureCard({
  icon,
  title,
  description,
  gradient = 'from-violet-500/20 to-purple-500/5',
  className
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        // Container with gradient background
        'group relative p-6 rounded-2xl',
        'bg-gradient-to-b',
        gradient,

        // Border
        'border border-white/10',

        // Hover
        'transition-all duration-300',
        'hover:border-white/20',
        'hover:-translate-y-1',

        className
      )}
    >
      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-white mb-2">
        {title}
      </h3>

      {/* Description */}
      <p className="text-white/60 text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}`,
  },

  // ═══════════════════════════════════════════════════════════════
  // HERO SECTIONS (50X Quality)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'HeroWithGradientBlurs',
    category: 'hero',
    description: 'Hero section with floating gradient orbs, headline, and CTA',
    tags: ['hero', 'gradient', 'blur', 'orbs', 'cta'],
    quality_score: 97,
    code: `'use client';

import { useState } from 'react';
import { PrimaryButton } from '@/components/ui/primary-button';

export function HeroSection() {
  const [email, setEmail] = useState('');

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-violet-500/20 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-violet-500/10 border border-violet-500/20 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
          </span>
          <span className="text-sm font-medium text-violet-300">
            Now in Public Beta
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
          <span className="text-white">Build anything.</span>
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
            50X faster.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10">
          The AI-powered platform that turns your ideas into production-ready
          applications. No code required.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <PrimaryButton size="lg">
            Start Building Free
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </PrimaryButton>

          <button className="px-6 py-3 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl transition-all duration-200">
            Watch Demo
          </button>
        </div>

        {/* Social proof */}
        <p className="mt-8 text-sm text-white/40">
          Trusted by 10,000+ developers worldwide
        </p>
      </div>
    </section>
  );
}`,
  },

  // ═══════════════════════════════════════════════════════════════
  // INPUTS (50X Quality)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'GlassInput',
    category: 'input',
    description: 'Glassmorphic input with focus ring and label',
    tags: ['input', 'glass', 'focus', 'label'],
    quality_score: 93,
    code: `'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-white/80"
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-4 py-3',
            'bg-white/5 border border-white/10 rounded-xl',
            'text-white placeholder-white/40',
            'transition-all duration-200',

            // Focus state
            'focus:outline-none focus:ring-2 focus:ring-violet-500/50',
            'focus:border-violet-500/50',
            'focus:bg-white/[0.07]',

            // Error state
            error && 'border-red-500/50 focus:ring-red-500/50',

            className
          )}
          {...props}
        />

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';`,
  },

  // ═══════════════════════════════════════════════════════════════
  // NAVIGATION (50X Quality)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'GlassNavbar',
    category: 'navbar',
    description: 'Fixed glassmorphic navbar with logo, links, and auth buttons',
    tags: ['navbar', 'glass', 'fixed', 'blur', 'auth'],
    quality_score: 95,
    code: `'use client';

import Link from 'next/link';
import { PrimaryButton } from '@/components/ui/primary-button';
import { GhostButton } from '@/components/ui/ghost-button';

const navLinks = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
];

export function GlassNavbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">OLYMPUS</span>
            </Link>

            {/* Nav Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 text-sm text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <GhostButton asChild>
                <Link href="/login">Log in</Link>
              </GhostButton>
              <PrimaryButton size="sm" asChild>
                <Link href="/signup">Sign up</Link>
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}`,
  },
];

async function seedComponents() {
  console.log('Initializing component store...');
  const store = new ComponentStore();
  const embedder = new Embedder();

  await store.initialize();

  console.log(`Seeding ${SEED_COMPONENTS.length} components...`);

  for (const component of SEED_COMPONENTS) {
    console.log(`  Adding: ${component.name}`);

    const embedding = await embedder.embedComponent({
      name: component.name,
      description: component.description,
      code: component.code,
      tags: component.tags,
    });

    await store.addComponent({
      id: `seed-${component.name.toLowerCase()}`,
      ...component,
      created_at: new Date(),
    }, embedding);
  }

  console.log('Done! Component library seeded.');
}

seedComponents().catch(console.error);
```

---

# PART 2: VISION PIPELINE

## Purpose
Allow agents to "see" their output and compare it to reference designs.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      VISION PIPELINE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  INPUT                    PROCESS                    OUTPUT      │
│                                                                  │
│  ┌─────────┐    ┌─────────────────────┐    ┌─────────────┐     │
│  │ Code    │───►│ Headless Browser    │───►│ Screenshot  │     │
│  │ Output  │    │ (Playwright)        │    │ PNG         │     │
│  └─────────┘    └─────────────────────┘    └──────┬──────┘     │
│                                                    │             │
│  ┌─────────┐                               ┌──────▼──────┐     │
│  │Reference│                               │ Vision AI   │     │
│  │ Design  │──────────────────────────────►│ Comparison  │     │
│  └─────────┘                               └──────┬──────┘     │
│                                                    │             │
│                                             ┌──────▼──────┐     │
│                                             │ Score +     │     │
│                                             │ Feedback    │     │
│                                             │ (0-100)     │     │
│                                             └─────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation

### File: `/src/lib/agents/vision/renderer.ts`

```typescript
import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ComponentRenderer {
  private browser: Browser | null = null;

  /**
   * Initialize browser instance
   */
  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
    });
  }

  /**
   * Close browser instance
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Render a React component and take screenshot
   */
  async renderComponent(code: string, options: {
    width?: number;
    height?: number;
    darkMode?: boolean;
  } = {}): Promise<Buffer> {
    if (!this.browser) {
      await this.initialize();
    }

    const { width = 800, height = 600, darkMode = true } = options;

    // Create HTML wrapper
    const html = `
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            primary: {
              400: '#a78bfa',
              500: '#8b5cf6',
              600: '#7c3aed',
              700: '#6d28d9',
            },
            violet: {
              400: '#a78bfa',
              500: '#8b5cf6',
              600: '#7c3aed',
              700: '#6d28d9',
            },
          },
        },
      },
    }
  </script>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: ${darkMode ? '#0a0a0a' : '#ffffff'};
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  </style>
</head>
<body class="${darkMode ? 'dark' : ''}">
  <div id="root"></div>
  <script type="text/babel">
    ${code}

    // Try to render the default export or named Component
    const Component = typeof exports !== 'undefined' && exports.default
      ? exports.default
      : (typeof Component !== 'undefined' ? Component : () => <div>No component found</div>);

    ReactDOM.render(<Component />, document.getElementById('root'));
  </script>
</body>
</html>`;

    const page = await this.browser!.newPage();
    await page.setViewportSize({ width, height });
    await page.setContent(html);

    // Wait for component to render
    await page.waitForTimeout(1000);

    const screenshot = await page.screenshot({ type: 'png' });
    await page.close();

    return screenshot;
  }

  /**
   * Render a full page and take screenshot
   */
  async renderPage(url: string, options: {
    width?: number;
    height?: number;
    fullPage?: boolean;
  } = {}): Promise<Buffer> {
    if (!this.browser) {
      await this.initialize();
    }

    const { width = 1440, height = 900, fullPage = false } = options;

    const page = await this.browser!.newPage();
    await page.setViewportSize({ width, height });
    await page.goto(url, { waitUntil: 'networkidle' });

    const screenshot = await page.screenshot({
      type: 'png',
      fullPage,
    });

    await page.close();

    return screenshot;
  }
}
```

### File: `/src/lib/agents/vision/comparator.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';

interface ComparisonResult {
  score: number;  // 0-100
  feedback: string[];
  improvements: string[];
  passed: boolean;  // score >= 85
}

export class VisualComparator {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic();
  }

  /**
   * Compare generated output to reference design
   */
  async compare(
    generated: Buffer,
    reference?: Buffer,
    requirements?: string
  ): Promise<ComparisonResult> {
    const images: Anthropic.ImageBlockParam[] = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: generated.toString('base64'),
        },
      },
    ];

    if (reference) {
      images.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: reference.toString('base64'),
        },
      });
    }

    const prompt = reference
      ? `You are a senior UI/UX designer reviewing generated output.

IMAGE 1: Generated output
IMAGE 2: Reference design (what it should look like)

${requirements ? `REQUIREMENTS:\n${requirements}\n` : ''}

Evaluate the generated output and provide:

1. SCORE (0-100): How well does the generated output match the reference and requirements?
   - 90-100: Excellent, production ready
   - 80-89: Good, minor improvements needed
   - 70-79: Acceptable, several improvements needed
   - Below 70: Needs significant work

2. FEEDBACK: List specific issues found (visual hierarchy, colors, spacing, typography, animations)

3. IMPROVEMENTS: Specific code changes needed to fix the issues

Respond in JSON format:
{
  "score": <number>,
  "feedback": ["<issue 1>", "<issue 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"]
}`
      : `You are a senior UI/UX designer reviewing generated output for a premium dark-mode web application.

${requirements ? `REQUIREMENTS:\n${requirements}\n` : ''}

DESIGN STANDARDS (50X Quality):
- Dark background (#0a0a0a or similar)
- Glassmorphic cards (blur, transparent borders)
- Gradient accents (violet/purple/blue)
- Proper typography hierarchy
- Hover states and transitions
- Visual polish (shadows, glows)

Evaluate the generated output and provide:

1. SCORE (0-100): How well does it meet 50X quality standards?
   - 90-100: Exceptional, Vercel/Linear quality
   - 80-89: Good, production ready
   - 70-79: Average, needs polish
   - Below 70: Generic AI output

2. FEEDBACK: List specific issues (be harsh but constructive)

3. IMPROVEMENTS: Specific code changes to achieve 50X quality

Respond in JSON format:
{
  "score": <number>,
  "feedback": ["<issue 1>", "<issue 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"]
}`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            ...images,
            { type: 'text', text: prompt },
          ],
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');

      const result = JSON.parse(jsonMatch[0]);

      return {
        score: result.score,
        feedback: result.feedback || [],
        improvements: result.improvements || [],
        passed: result.score >= 85,
      };
    } catch (e) {
      // Fallback if parsing fails
      return {
        score: 50,
        feedback: ['Failed to parse vision comparison result'],
        improvements: ['Retry generation'],
        passed: false,
      };
    }
  }
}
```

---

# PART 3: AGENT PIPELINE (Chain-of-Thought)

## New Agent Definitions

### File: `/src/lib/agents/registry/pipeline.ts`

```typescript
/**
 * 50X AGENT PIPELINE
 *
 * PLANNER → DESIGNER → CODER → REVIEWER → FIXER
 *
 * Each agent has a specific role and passes output to the next.
 */

import type { AgentDefinition } from '../types';

export const pipelineAgents: AgentDefinition[] = [
  // ═══════════════════════════════════════════════════════════════
  // PLANNER - Thinks before coding
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'planner',
    name: 'PLANNER',
    description: 'Analyzes requirements and creates implementation plan',
    phase: 'planning',
    tier: 'sonnet',
    dependencies: [],
    optional: false,
    systemPrompt: `You are PLANNER, the strategic thinker.

YOUR ROLE: Analyze requirements and create a detailed implementation plan BEFORE any code is written.

═══════════════════════════════════════════════════════════════
CHAIN-OF-THOUGHT PROCESS (You MUST follow these steps)
═══════════════════════════════════════════════════════════════

STEP 1: UNDERSTAND
- What is being requested?
- What is the end goal?
- Who is the target user?

STEP 2: ANALYZE
- What components are needed?
- What is the visual hierarchy?
- What interactions are required?
- What data flows are involved?

STEP 3: REFERENCE
- What similar components exist in the library? (USE RAG RESULTS)
- What patterns should be followed?
- What anti-patterns should be avoided?

STEP 4: PLAN
- Break down into atomic tasks
- Order tasks by dependency
- Identify potential challenges
- Define success criteria

═══════════════════════════════════════════════════════════════

OUTPUT FORMAT:
\`\`\`json
{
  "understanding": {
    "goal": "<main objective>",
    "users": "<target users>",
    "context": "<where this fits in the app>"
  },
  "components_needed": [
    {
      "name": "<ComponentName>",
      "type": "<button|card|form|etc>",
      "purpose": "<what it does>",
      "interactions": ["<hover>", "<click>", etc]
    }
  ],
  "visual_hierarchy": {
    "primary_focus": "<what should stand out>",
    "secondary_elements": ["<list>"],
    "layout_pattern": "<grid|flex|stack>"
  },
  "technical_approach": {
    "state_management": "<local|context|store>",
    "data_flow": "<description>",
    "key_challenges": ["<challenge 1>", "<challenge 2>"]
  },
  "tasks": [
    {
      "id": 1,
      "task": "<specific task>",
      "agent": "<which agent handles this>",
      "depends_on": []
    }
  ],
  "success_criteria": [
    "<criterion 1>",
    "<criterion 2>"
  ]
}
\`\`\``,
    outputSchema: {
      type: 'object',
      required: ['understanding', 'components_needed', 'tasks'],
      properties: {
        understanding: { type: 'object' },
        components_needed: { type: 'array' },
        visual_hierarchy: { type: 'object' },
        technical_approach: { type: 'object' },
        tasks: { type: 'array' },
        success_criteria: { type: 'array' },
      },
    },
    maxRetries: 2,
    timeout: 60000,
    capabilities: ['planning', 'analysis'],
  },

  // ═══════════════════════════════════════════════════════════════
  // DESIGNER - Creates visual specifications
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'designer',
    name: 'DESIGNER',
    description: 'Creates detailed visual specifications from plan',
    phase: 'design',
    tier: 'sonnet',
    dependencies: ['planner'],
    optional: false,
    systemPrompt: `You are DESIGNER, the visual architect.

YOUR ROLE: Transform the PLANNER's analysis into detailed visual specifications that CODER will implement.

═══════════════════════════════════════════════════════════════
50X DESIGN SYSTEM (MANDATORY)
═══════════════════════════════════════════════════════════════

COLORS:
- Background: #0a0a0a (primary), #0d0d0d (cards), #141414 (elevated)
- Text: white (primary), white/60 (secondary), white/40 (muted)
- Brand: violet-600 (#7c3aed), violet-500, purple-600
- Borders: white/10 (default), white/20 (hover)

EFFECTS:
- Glassmorphism: bg-white/[0.03] backdrop-blur-xl border border-white/10
- Glow: shadow-[0_0_50px_rgba(124,58,237,0.3)]
- Gradients: from-violet-600 to-purple-600

TYPOGRAPHY:
- Hero: text-7xl font-bold tracking-tight
- H1: text-5xl font-bold
- H2: text-4xl font-bold
- H3: text-2xl font-semibold
- Body: text-base
- Small: text-sm

ANIMATIONS:
- Hover lift: hover:-translate-y-1 transition-transform duration-200
- Hover glow: hover:shadow-[...] transition-shadow duration-300
- Fade in: animate-in fade-in duration-500
- All interactive elements MUST have transitions

═══════════════════════════════════════════════════════════════
REFERENCE EXAMPLES (From RAG)
═══════════════════════════════════════════════════════════════

{{RAG_EXAMPLES}}

═══════════════════════════════════════════════════════════════

OUTPUT FORMAT:
\`\`\`json
{
  "design_tokens": {
    "colors_used": ["<color1>", "<color2>"],
    "typography_scale": ["<text-7xl>", "<text-xl>"],
    "spacing": ["<gap-4>", "<p-6>"],
    "effects": ["<glassmorphism>", "<gradient>"]
  },
  "components": [
    {
      "name": "<ComponentName>",
      "tailwind_classes": {
        "container": "<classes>",
        "hover": "<hover classes>",
        "focus": "<focus classes>"
      },
      "structure": "<JSX structure description>",
      "animations": ["<animation1>", "<animation2>"]
    }
  ],
  "layout": {
    "type": "<grid|flex|stack>",
    "responsive": {
      "mobile": "<description>",
      "tablet": "<description>",
      "desktop": "<description>"
    }
  },
  "visual_notes": [
    "<important visual consideration>",
    "<accessibility note>"
  ]
}
\`\`\``,
    outputSchema: {
      type: 'object',
      required: ['design_tokens', 'components', 'layout'],
      properties: {
        design_tokens: { type: 'object' },
        components: { type: 'array' },
        layout: { type: 'object' },
        visual_notes: { type: 'array' },
      },
    },
    maxRetries: 2,
    timeout: 90000,
    capabilities: ['design', 'ui_specification'],
  },

  // ═══════════════════════════════════════════════════════════════
  // CODER - Implements the design
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'coder',
    name: 'CODER',
    description: 'Implements components based on design specifications',
    phase: 'implementation',
    tier: 'opus',
    dependencies: ['designer'],
    optional: false,
    systemPrompt: `You are CODER, the implementation expert.

YOUR ROLE: Transform DESIGNER's specifications into production-quality React/TypeScript code.

═══════════════════════════════════════════════════════════════
CODE STANDARDS (NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════════

REQUIRED IN EVERY COMPONENT:
□ 'use client' directive (if using hooks/interactivity)
□ TypeScript strict mode (proper interfaces)
□ forwardRef for form elements
□ Proper prop types with defaults
□ cn() utility for class merging
□ Transition on ALL hover states
□ Focus states for accessibility
□ displayName for debugging

FORBIDDEN:
✗ bg-blue-500 (generic color)
✗ Inline styles
✗ Any color outside design system
✗ Buttons without hover states
✗ Missing transitions
✗ Empty onClick handlers
✗ href="#" links

═══════════════════════════════════════════════════════════════
FEW-SHOT EXAMPLES (FOLLOW THESE PATTERNS)
═══════════════════════════════════════════════════════════════

{{FEW_SHOT_EXAMPLES}}

═══════════════════════════════════════════════════════════════

OUTPUT FORMAT:
\`\`\`json
{
  "files": [
    {
      "path": "src/components/ui/<name>.tsx",
      "content": "<full component code>",
      "exports": ["<ComponentName>"]
    }
  ],
  "dependencies": ["<package1>", "<package2>"],
  "usage_example": "<how to use the component>"
}
\`\`\``,
    outputSchema: {
      type: 'object',
      required: ['files'],
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'object',
            required: ['path', 'content'],
            properties: {
              path: { type: 'string' },
              content: { type: 'string' },
              exports: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        dependencies: { type: 'array', items: { type: 'string' } },
        usage_example: { type: 'string' },
      },
    },
    maxRetries: 3,
    timeout: 180000,
    capabilities: ['code_generation'],
  },

  // ═══════════════════════════════════════════════════════════════
  // REVIEWER - Critiques the output
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'reviewer',
    name: 'REVIEWER',
    description: 'Reviews generated code for quality and design compliance',
    phase: 'review',
    tier: 'sonnet',
    dependencies: ['coder'],
    optional: false,
    systemPrompt: `You are REVIEWER, the quality guardian.

YOUR ROLE: Critically review CODER's output against 50X quality standards.

═══════════════════════════════════════════════════════════════
REVIEW CHECKLIST (Check EVERY item)
═══════════════════════════════════════════════════════════════

DESIGN COMPLIANCE:
□ Uses ONLY brand colors (violet/purple palette)
□ Has glassmorphism where appropriate
□ Typography follows scale (7xl → xs)
□ Proper spacing (gap/padding)
□ Dark background (#0a0a0a)

INTERACTIONS:
□ ALL buttons have hover states
□ ALL hover states have transitions
□ Focus states for keyboard nav
□ Loading states where needed
□ Error states for forms

CODE QUALITY:
□ TypeScript strict (no any)
□ Proper component structure
□ No unused imports
□ No console.logs
□ Proper error handling

ACCESSIBILITY:
□ Semantic HTML
□ ARIA labels where needed
□ Keyboard navigable
□ Focus visible
□ Color contrast

═══════════════════════════════════════════════════════════════

OUTPUT FORMAT:
\`\`\`json
{
  "score": <0-100>,
  "passed": <true if score >= 85>,
  "issues": [
    {
      "severity": "<critical|major|minor>",
      "category": "<design|code|a11y|interaction>",
      "file": "<file path>",
      "line": <line number or null>,
      "issue": "<description>",
      "fix": "<how to fix>"
    }
  ],
  "summary": "<overall assessment>"
}
\`\`\``,
    outputSchema: {
      type: 'object',
      required: ['score', 'passed', 'issues'],
      properties: {
        score: { type: 'number' },
        passed: { type: 'boolean' },
        issues: { type: 'array' },
        summary: { type: 'string' },
      },
    },
    maxRetries: 2,
    timeout: 60000,
    capabilities: ['review', 'quality_assurance'],
  },

  // ═══════════════════════════════════════════════════════════════
  // FIXER - Improves based on feedback
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'fixer',
    name: 'FIXER',
    description: 'Fixes issues identified by REVIEWER',
    phase: 'refinement',
    tier: 'opus',
    dependencies: ['reviewer'],
    optional: false,
    systemPrompt: `You are FIXER, the refinement expert.

YOUR ROLE: Fix ALL issues identified by REVIEWER to achieve 50X quality.

═══════════════════════════════════════════════════════════════
FIX PRIORITY
═══════════════════════════════════════════════════════════════

1. CRITICAL issues (must fix)
   - Missing transitions
   - Wrong colors
   - Broken interactions
   - Accessibility violations

2. MAJOR issues (should fix)
   - Inconsistent spacing
   - Missing hover states
   - TypeScript errors
   - Poor structure

3. MINOR issues (nice to fix)
   - Code style
   - Naming conventions
   - Documentation

═══════════════════════════════════════════════════════════════
FIXING RULES
═══════════════════════════════════════════════════════════════

- Fix ALL critical and major issues
- Output the COMPLETE fixed file (not diffs)
- Maintain existing functionality
- Don't introduce new issues
- Test your fixes mentally

═══════════════════════════════════════════════════════════════

OUTPUT FORMAT:
\`\`\`json
{
  "files": [
    {
      "path": "<file path>",
      "content": "<complete fixed code>",
      "fixes_applied": ["<fix 1>", "<fix 2>"]
    }
  ],
  "issues_fixed": <number>,
  "issues_remaining": <number>,
  "notes": "<any notes about fixes>"
}
\`\`\``,
    outputSchema: {
      type: 'object',
      required: ['files', 'issues_fixed'],
      properties: {
        files: { type: 'array' },
        issues_fixed: { type: 'number' },
        issues_remaining: { type: 'number' },
        notes: { type: 'string' },
      },
    },
    maxRetries: 3,
    timeout: 180000,
    capabilities: ['code_generation', 'refactoring'],
  },
];
```

---

# PART 4: CONTEXT ASSEMBLER

## Purpose
Dynamically build optimal prompts by combining:
- User request
- RAG examples
- Design system
- Previous context
- Vision inputs (if available)

### File: `/src/lib/agents/context/assembler.ts`

```typescript
import { ComponentRetriever } from '../rag/retriever';
import { DESIGN_SYSTEM } from '../design-system';

interface ContextConfig {
  userRequest: string;
  agentId: string;
  previousOutputs?: Map<string, any>;
  visionInputs?: Buffer[];
  maxTokens?: number;
}

interface AssembledContext {
  systemPrompt: string;
  userPrompt: string;
  images?: Buffer[];
  estimatedTokens: number;
}

export class ContextAssembler {
  private retriever: ComponentRetriever;

  constructor() {
    this.retriever = new ComponentRetriever();
  }

  /**
   * Assemble optimized context for an agent
   */
  async assemble(config: ContextConfig): Promise<AssembledContext> {
    const {
      userRequest,
      agentId,
      previousOutputs,
      visionInputs,
      maxTokens = 8000,
    } = config;

    // Get relevant examples from RAG
    const ragExamples = await this.getRagExamples(userRequest, agentId);

    // Get few-shot examples for this agent type
    const fewShotExamples = await this.getFewShotExamples(agentId);

    // Build context from previous agent outputs
    const previousContext = this.buildPreviousContext(previousOutputs, agentId);

    // Assemble user prompt
    const userPrompt = this.buildUserPrompt({
      request: userRequest,
      ragExamples,
      fewShotExamples,
      previousContext,
      maxTokens,
    });

    return {
      systemPrompt: '', // Loaded from agent definition
      userPrompt,
      images: visionInputs,
      estimatedTokens: this.estimateTokens(userPrompt),
    };
  }

  /**
   * Get RAG examples relevant to the request
   */
  private async getRagExamples(request: string, agentId: string): Promise<string> {
    // Only CODER and DESIGNER need RAG examples
    if (!['coder', 'designer'].includes(agentId)) {
      return '';
    }

    const examples = await this.retriever.retrieve(request, { limit: 3 });

    if (examples.length === 0) {
      return '';
    }

    return `
═══════════════════════════════════════════════════════════════
REFERENCE EXAMPLES (From Component Library)
═══════════════════════════════════════════════════════════════

${examples.join('\n\n---\n\n')}

═══════════════════════════════════════════════════════════════
Use these as reference for quality and patterns. DO NOT copy directly.
═══════════════════════════════════════════════════════════════
`;
  }

  /**
   * Get few-shot examples for this agent
   */
  private async getFewShotExamples(agentId: string): Promise<string> {
    const examples: Record<string, string> = {
      coder: `
═══════════════════════════════════════════════════════════════
FEW-SHOT EXAMPLES (Follow these patterns EXACTLY)
═══════════════════════════════════════════════════════════════

### EXAMPLE 1: Button Component (50X Quality)
\`\`\`tsx
'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base
          'inline-flex items-center justify-center font-medium rounded-xl',
          'transition-all duration-200',

          // Focus
          'focus:outline-none focus:ring-2 focus:ring-violet-500/50',

          // Variants
          variant === 'primary' && [
            'bg-gradient-to-r from-violet-600 to-purple-600',
            'hover:from-violet-500 hover:to-purple-500',
            'text-white shadow-lg shadow-violet-500/25',
            'hover:shadow-xl hover:shadow-violet-500/40',
            'hover:-translate-y-0.5',
          ],
          variant === 'secondary' && [
            'bg-white/10 hover:bg-white/20',
            'text-white border border-white/10',
          ],
          variant === 'ghost' && [
            'text-white/60 hover:text-white',
            'hover:bg-white/5',
          ],

          // Sizes
          size === 'sm' && 'px-4 py-2 text-sm',
          size === 'md' && 'px-6 py-3 text-base',
          size === 'lg' && 'px-8 py-4 text-lg',

          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
\`\`\`

### EXAMPLE 2: Card Component (50X Quality)
\`\`\`tsx
'use client';

import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ className, hover = true, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        // Glassmorphism
        'bg-white/[0.03] backdrop-blur-xl',
        'border border-white/10 rounded-2xl p-6',

        // Hover
        hover && [
          'transition-all duration-300',
          'hover:bg-white/[0.05]',
          'hover:border-white/20',
          'hover:-translate-y-1',
          'hover:shadow-[0_0_40px_rgba(124,58,237,0.1)]',
        ],

        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
\`\`\`
`,
      designer: `
═══════════════════════════════════════════════════════════════
FEW-SHOT EXAMPLES (Design Specifications)
═══════════════════════════════════════════════════════════════

### EXAMPLE 1: Hero Section Design
\`\`\`json
{
  "design_tokens": {
    "colors_used": ["#0a0a0a", "violet-600", "purple-500", "white/60"],
    "typography_scale": ["text-7xl", "text-xl", "text-sm"],
    "spacing": ["py-20", "gap-4", "mb-8"],
    "effects": ["backdrop-blur-xl", "bg-gradient-to-r", "shadow-lg"]
  },
  "components": [
    {
      "name": "HeroBadge",
      "tailwind_classes": {
        "container": "inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full",
        "hover": "hover:bg-violet-500/20 transition-colors duration-200",
        "focus": "focus:ring-2 focus:ring-violet-500/50"
      }
    }
  ]
}
\`\`\`
`,
    };

    return examples[agentId] || '';
  }

  /**
   * Build context from previous agent outputs
   */
  private buildPreviousContext(
    outputs: Map<string, any> | undefined,
    currentAgent: string
  ): string {
    if (!outputs || outputs.size === 0) {
      return '';
    }

    const relevantAgents: Record<string, string[]> = {
      designer: ['planner'],
      coder: ['planner', 'designer'],
      reviewer: ['planner', 'designer', 'coder'],
      fixer: ['reviewer', 'coder'],
    };

    const relevant = relevantAgents[currentAgent] || [];
    const context: string[] = [];

    for (const agentId of relevant) {
      const output = outputs.get(agentId);
      if (output) {
        context.push(`
═══════════════════════════════════════════════════════════════
OUTPUT FROM ${agentId.toUpperCase()}
═══════════════════════════════════════════════════════════════

${JSON.stringify(output, null, 2)}
`);
      }
    }

    return context.join('\n\n');
  }

  /**
   * Build the final user prompt
   */
  private buildUserPrompt(config: {
    request: string;
    ragExamples: string;
    fewShotExamples: string;
    previousContext: string;
    maxTokens: number;
  }): string {
    const { request, ragExamples, fewShotExamples, previousContext, maxTokens } = config;

    // Start with highest priority (always included)
    let prompt = `
═══════════════════════════════════════════════════════════════
USER REQUEST
═══════════════════════════════════════════════════════════════

${request}

═══════════════════════════════════════════════════════════════
DESIGN SYSTEM
═══════════════════════════════════════════════════════════════

${JSON.stringify(DESIGN_SYSTEM, null, 2)}
`;

    // Add previous context if we have token budget
    if (previousContext && this.estimateTokens(prompt + previousContext) < maxTokens * 0.7) {
      prompt += previousContext;
    }

    // Add few-shot examples if we have token budget
    if (fewShotExamples && this.estimateTokens(prompt + fewShotExamples) < maxTokens * 0.85) {
      prompt += fewShotExamples;
    }

    // Add RAG examples if we have token budget
    if (ragExamples && this.estimateTokens(prompt + ragExamples) < maxTokens * 0.95) {
      prompt += ragExamples;
    }

    return prompt;
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: 4 characters per token
    return Math.ceil(text.length / 4);
  }
}
```

---

# PART 5: ITERATION LOOP

## Purpose
Retry generation with feedback until quality threshold is met.

### File: `/src/lib/agents/orchestrator/iteration-loop.ts`

```typescript
import { ComponentRenderer } from '../vision/renderer';
import { VisualComparator } from '../vision/comparator';

interface IterationConfig {
  maxIterations: number;
  qualityThreshold: number;  // 0-100, default 85
  enableVision: boolean;
}

interface IterationResult {
  finalOutput: any;
  iterations: number;
  finalScore: number;
  passed: boolean;
  history: Array<{
    iteration: number;
    output: any;
    score: number;
    feedback: string[];
  }>;
}

export class IterationLoop {
  private renderer: ComponentRenderer;
  private comparator: VisualComparator;
  private config: IterationConfig;

  constructor(config: Partial<IterationConfig> = {}) {
    this.config = {
      maxIterations: 3,
      qualityThreshold: 85,
      enableVision: true,
      ...config,
    };
    this.renderer = new ComponentRenderer();
    this.comparator = new VisualComparator();
  }

  /**
   * Run iteration loop until quality threshold or max iterations
   */
  async run(
    generateFn: (feedback?: string[]) => Promise<any>,
    validateFn: (output: any) => Promise<{ score: number; feedback: string[] }>,
    options: {
      referenceImage?: Buffer;
      requirements?: string;
    } = {}
  ): Promise<IterationResult> {
    const history: IterationResult['history'] = [];
    let currentOutput: any = null;
    let currentScore = 0;
    let currentFeedback: string[] = [];

    for (let i = 1; i <= this.config.maxIterations; i++) {
      console.log(`[IterationLoop] Iteration ${i}/${this.config.maxIterations}`);

      // Generate (with feedback from previous iteration)
      currentOutput = await generateFn(i > 1 ? currentFeedback : undefined);

      // Validate with REVIEWER agent
      const reviewResult = await validateFn(currentOutput);

      // If vision is enabled, also do visual comparison
      let visionScore = 100;
      let visionFeedback: string[] = [];

      if (this.config.enableVision && currentOutput.files) {
        try {
          const codeFile = currentOutput.files.find((f: any) => f.path.endsWith('.tsx'));
          if (codeFile) {
            const screenshot = await this.renderer.renderComponent(codeFile.content);
            const visionResult = await this.comparator.compare(
              screenshot,
              options.referenceImage,
              options.requirements
            );
            visionScore = visionResult.score;
            visionFeedback = visionResult.feedback;
          }
        } catch (e) {
          console.warn('[IterationLoop] Vision validation failed:', e);
        }
      }

      // Combine scores (weighted average)
      currentScore = Math.round(
        reviewResult.score * 0.6 + visionScore * 0.4
      );
      currentFeedback = [...reviewResult.feedback, ...visionFeedback];

      // Record history
      history.push({
        iteration: i,
        output: currentOutput,
        score: currentScore,
        feedback: currentFeedback,
      });

      console.log(`[IterationLoop] Score: ${currentScore}/100`);

      // Check if we passed
      if (currentScore >= this.config.qualityThreshold) {
        console.log(`[IterationLoop] ✓ Passed on iteration ${i}`);
        break;
      }

      if (i < this.config.maxIterations) {
        console.log(`[IterationLoop] ✗ Below threshold, retrying with feedback...`);
      }
    }

    // Cleanup
    await this.renderer.close();

    return {
      finalOutput: currentOutput,
      iterations: history.length,
      finalScore: currentScore,
      passed: currentScore >= this.config.qualityThreshold,
      history,
    };
  }
}
```

---

# PART 6: COMPLETE ORCHESTRATOR

### File: `/src/lib/agents/orchestrator/pipeline-orchestrator.ts`

```typescript
/**
 * 50X PIPELINE ORCHESTRATOR
 *
 * Coordinates the entire agent pipeline:
 * PLANNER → DESIGNER → CODER → REVIEWER → FIXER
 *
 * With RAG, vision, and iteration loops.
 */

import { ContextAssembler } from '../context/assembler';
import { IterationLoop } from './iteration-loop';
import { pipelineAgents } from '../registry/pipeline';
import { executeAgent } from '../executor/executor';
import { ComponentStore } from '../rag/component-store';
import { Embedder } from '../rag/embedder';

interface PipelineConfig {
  enableVision: boolean;
  enableRAG: boolean;
  enableIteration: boolean;
  qualityThreshold: number;
  maxIterations: number;
}

interface PipelineResult {
  success: boolean;
  files: Array<{ path: string; content: string }>;
  score: number;
  iterations: number;
  agentOutputs: Map<string, any>;
  errors: string[];
}

export class PipelineOrchestrator {
  private assembler: ContextAssembler;
  private iterationLoop: IterationLoop;
  private componentStore: ComponentStore;
  private embedder: Embedder;
  private config: PipelineConfig;

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = {
      enableVision: true,
      enableRAG: true,
      enableIteration: true,
      qualityThreshold: 85,
      maxIterations: 3,
      ...config,
    };

    this.assembler = new ContextAssembler();
    this.iterationLoop = new IterationLoop({
      maxIterations: this.config.maxIterations,
      qualityThreshold: this.config.qualityThreshold,
      enableVision: this.config.enableVision,
    });
    this.componentStore = new ComponentStore();
    this.embedder = new Embedder();
  }

  /**
   * Run the complete pipeline
   */
  async run(request: string, options: {
    referenceImages?: Buffer[];
    requirements?: string;
  } = {}): Promise<PipelineResult> {
    const agentOutputs = new Map<string, any>();
    const errors: string[] = [];

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('50X PIPELINE STARTED');
    console.log('═══════════════════════════════════════════════════════════════');

    try {
      // ═══════════════════════════════════════════════════════════════
      // PHASE 1: PLANNING
      // ═══════════════════════════════════════════════════════════════
      console.log('\n[PHASE 1] PLANNER');

      const plannerContext = await this.assembler.assemble({
        userRequest: request,
        agentId: 'planner',
      });

      const plannerAgent = pipelineAgents.find(a => a.id === 'planner')!;
      const plannerOutput = await executeAgent(plannerAgent, plannerContext.userPrompt);
      agentOutputs.set('planner', plannerOutput);

      console.log('  ✓ Planning complete');

      // ═══════════════════════════════════════════════════════════════
      // PHASE 2: DESIGN
      // ═══════════════════════════════════════════════════════════════
      console.log('\n[PHASE 2] DESIGNER');

      const designerContext = await this.assembler.assemble({
        userRequest: request,
        agentId: 'designer',
        previousOutputs: agentOutputs,
        visionInputs: options.referenceImages,
      });

      const designerAgent = pipelineAgents.find(a => a.id === 'designer')!;
      const designerOutput = await executeAgent(designerAgent, designerContext.userPrompt);
      agentOutputs.set('designer', designerOutput);

      console.log('  ✓ Design complete');

      // ═══════════════════════════════════════════════════════════════
      // PHASE 3: IMPLEMENTATION (with iteration)
      // ═══════════════════════════════════════════════════════════════
      console.log('\n[PHASE 3] CODER + REVIEWER + FIXER (Iteration Loop)');

      const coderAgent = pipelineAgents.find(a => a.id === 'coder')!;
      const reviewerAgent = pipelineAgents.find(a => a.id === 'reviewer')!;
      const fixerAgent = pipelineAgents.find(a => a.id === 'fixer')!;

      const iterationResult = await this.iterationLoop.run(
        // Generate function
        async (feedback?: string[]) => {
          if (feedback && feedback.length > 0) {
            // Use FIXER for subsequent iterations
            const fixerContext = await this.assembler.assemble({
              userRequest: `Fix these issues:\n${feedback.join('\n')}\n\nOriginal request: ${request}`,
              agentId: 'fixer',
              previousOutputs: agentOutputs,
            });
            return await executeAgent(fixerAgent, fixerContext.userPrompt);
          } else {
            // Use CODER for first iteration
            const coderContext = await this.assembler.assemble({
              userRequest: request,
              agentId: 'coder',
              previousOutputs: agentOutputs,
            });
            return await executeAgent(coderAgent, coderContext.userPrompt);
          }
        },
        // Validate function
        async (output: any) => {
          const reviewerContext = await this.assembler.assemble({
            userRequest: `Review this code:\n${JSON.stringify(output, null, 2)}`,
            agentId: 'reviewer',
            previousOutputs: agentOutputs,
          });
          const reviewOutput = await executeAgent(reviewerAgent, reviewerContext.userPrompt);
          return {
            score: reviewOutput.score || 50,
            feedback: reviewOutput.issues?.map((i: any) => i.issue) || [],
          };
        },
        {
          referenceImage: options.referenceImages?.[0],
          requirements: options.requirements,
        }
      );

      agentOutputs.set('coder', iterationResult.finalOutput);

      console.log(`  ✓ Implementation complete (${iterationResult.iterations} iterations, score: ${iterationResult.finalScore})`);

      // ═══════════════════════════════════════════════════════════════
      // PHASE 4: OUTPUT
      // ═══════════════════════════════════════════════════════════════
      console.log('\n[PHASE 4] OUTPUT');

      const files = iterationResult.finalOutput?.files || [];

      // Save good components to RAG for future reference
      if (this.config.enableRAG && iterationResult.finalScore >= 85) {
        await this.saveToRAG(files, request);
      }

      console.log(`  ✓ Generated ${files.length} files`);

      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('50X PIPELINE COMPLETE');
      console.log(`  Score: ${iterationResult.finalScore}/100`);
      console.log(`  Passed: ${iterationResult.passed ? 'YES' : 'NO'}`);
      console.log('═══════════════════════════════════════════════════════════════');

      return {
        success: iterationResult.passed,
        files,
        score: iterationResult.finalScore,
        iterations: iterationResult.iterations,
        agentOutputs,
        errors,
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(message);
      console.error('[Pipeline] Error:', message);

      return {
        success: false,
        files: [],
        score: 0,
        iterations: 0,
        agentOutputs,
        errors,
      };
    }
  }

  /**
   * Save successful components to RAG for future reference
   */
  private async saveToRAG(
    files: Array<{ path: string; content: string }>,
    request: string
  ): Promise<void> {
    try {
      for (const file of files) {
        if (!file.path.endsWith('.tsx')) continue;

        const name = file.path.split('/').pop()?.replace('.tsx', '') || 'Unknown';
        const embedding = await this.embedder.embedComponent({
          name,
          description: request,
          code: file.content,
          tags: this.extractTags(file.content),
        });

        await this.componentStore.addComponent({
          id: `generated-${Date.now()}-${name}`,
          name,
          category: this.detectCategory(file.path),
          description: request,
          code: file.content,
          tags: this.extractTags(file.content),
          quality_score: 85, // Minimum to be saved
          created_at: new Date(),
        }, embedding);
      }
    } catch (e) {
      console.warn('[Pipeline] Failed to save to RAG:', e);
    }
  }

  private extractTags(code: string): string[] {
    const tags: string[] = [];
    if (code.includes('hover:')) tags.push('hover');
    if (code.includes('transition')) tags.push('animated');
    if (code.includes('gradient')) tags.push('gradient');
    if (code.includes('backdrop-blur')) tags.push('glass');
    if (code.includes('violet-')) tags.push('brand-colors');
    return tags;
  }

  private detectCategory(path: string): any {
    if (path.includes('button')) return 'button';
    if (path.includes('card')) return 'card';
    if (path.includes('input') || path.includes('form')) return 'form';
    if (path.includes('nav')) return 'navbar';
    if (path.includes('hero')) return 'hero';
    if (path.includes('footer')) return 'footer';
    return 'button'; // default
  }
}
```

---

# PART 7: DESIGN SYSTEM FILE

### File: `/src/lib/agents/design-system.ts`

```typescript
/**
 * OLYMPUS 50X DESIGN SYSTEM
 *
 * This is the single source of truth for all design tokens.
 * Injected into every agent prompt.
 */

export const DESIGN_SYSTEM = {
  // ═══════════════════════════════════════════════════════════════
  // COLORS
  // ═══════════════════════════════════════════════════════════════
  colors: {
    background: {
      primary: '#0a0a0a',
      secondary: '#0d0d0d',
      tertiary: '#141414',
      elevated: '#1a1a1a',
    },
    text: {
      primary: 'rgba(255, 255, 255, 1)',
      secondary: 'rgba(255, 255, 255, 0.6)',
      muted: 'rgba(255, 255, 255, 0.4)',
      disabled: 'rgba(255, 255, 255, 0.2)',
    },
    brand: {
      violet: {
        50: '#f5f3ff',
        100: '#ede9fe',
        200: '#ddd6fe',
        300: '#c4b5fd',
        400: '#a78bfa',
        500: '#8b5cf6',
        600: '#7c3aed',  // PRIMARY
        700: '#6d28d9',
        800: '#5b21b6',
        900: '#4c1d95',
      },
      purple: {
        500: '#a855f7',
        600: '#9333ea',
      },
      blue: {
        400: '#60a5fa',
        500: '#3b82f6',
      },
    },
    border: {
      default: 'rgba(255, 255, 255, 0.1)',
      hover: 'rgba(255, 255, 255, 0.2)',
      focus: 'rgba(124, 58, 237, 0.5)',
    },
    state: {
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // TYPOGRAPHY
  // ═══════════════════════════════════════════════════════════════
  typography: {
    fontFamily: {
      sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, monospace',
    },
    scale: {
      hero: { class: 'text-7xl', size: '72px', weight: 'font-bold', tracking: 'tracking-tight' },
      h1: { class: 'text-5xl', size: '48px', weight: 'font-bold', tracking: 'tracking-tight' },
      h2: { class: 'text-4xl', size: '36px', weight: 'font-bold', tracking: 'tracking-tight' },
      h3: { class: 'text-2xl', size: '24px', weight: 'font-semibold', tracking: '' },
      h4: { class: 'text-xl', size: '20px', weight: 'font-semibold', tracking: '' },
      h5: { class: 'text-lg', size: '18px', weight: 'font-medium', tracking: '' },
      body: { class: 'text-base', size: '16px', weight: 'font-normal', tracking: '' },
      small: { class: 'text-sm', size: '14px', weight: 'font-normal', tracking: '' },
      tiny: { class: 'text-xs', size: '12px', weight: 'font-normal', tracking: '' },
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // SPACING
  // ═══════════════════════════════════════════════════════════════
  spacing: {
    base: 4,
    scale: {
      0: '0px',
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      5: '20px',
      6: '24px',
      8: '32px',
      10: '40px',
      12: '48px',
      16: '64px',
      20: '80px',
      24: '96px',
    },
    component: {
      button: { x: 'px-6', y: 'py-3' },
      card: { all: 'p-6' },
      input: { x: 'px-4', y: 'py-3' },
      section: { y: 'py-20' },
    },
    gap: {
      tight: 'gap-2',    // 8px
      normal: 'gap-4',   // 16px
      loose: 'gap-6',    // 24px
      wide: 'gap-8',     // 32px
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════
  effects: {
    glassmorphism: {
      light: 'bg-white/[0.02] backdrop-blur-lg border border-white/5',
      default: 'bg-white/[0.03] backdrop-blur-xl border border-white/10',
      strong: 'bg-white/[0.05] backdrop-blur-2xl border border-white/15',
    },
    glow: {
      subtle: 'shadow-[0_0_30px_rgba(124,58,237,0.15)]',
      default: 'shadow-[0_0_50px_rgba(124,58,237,0.25)]',
      strong: 'shadow-[0_0_80px_rgba(124,58,237,0.35)]',
    },
    gradient: {
      text: 'bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent',
      button: 'bg-gradient-to-r from-violet-600 to-purple-600',
      buttonHover: 'hover:from-violet-500 hover:to-purple-500',
      background: 'bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-transparent',
      border: 'bg-gradient-to-r from-violet-500/50 to-purple-500/50',
    },
    blur: {
      sm: 'blur-[50px]',
      md: 'blur-[100px]',
      lg: 'blur-[150px]',
    },
    shadow: {
      button: 'shadow-lg shadow-violet-500/25',
      buttonHover: 'shadow-xl shadow-violet-500/40',
      card: 'shadow-xl shadow-black/20',
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // ANIMATIONS
  // ═══════════════════════════════════════════════════════════════
  animations: {
    duration: {
      instant: 'duration-75',
      fast: 'duration-150',
      normal: 'duration-200',
      slow: 'duration-300',
      slower: 'duration-500',
    },
    easing: {
      default: 'ease-out',
      in: 'ease-in',
      inOut: 'ease-in-out',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
    hover: {
      lift: 'hover:-translate-y-1 transition-transform duration-200',
      scale: 'hover:scale-105 transition-transform duration-200',
      glow: 'hover:shadow-[0_0_30px_rgba(124,58,237,0.4)] transition-shadow duration-300',
      brighten: 'hover:brightness-110 transition-all duration-200',
    },
    enter: {
      fadeIn: 'animate-in fade-in duration-500',
      slideUp: 'animate-in slide-in-from-bottom-4 duration-500',
      slideDown: 'animate-in slide-in-from-top-4 duration-500',
      scaleIn: 'animate-in zoom-in-95 duration-300',
    },
    loading: {
      pulse: 'animate-pulse',
      spin: 'animate-spin',
      bounce: 'animate-bounce',
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // COMPONENT PATTERNS
  // ═══════════════════════════════════════════════════════════════
  components: {
    button: {
      base: 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] disabled:opacity-50 disabled:cursor-not-allowed',
      primary: 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/40 hover:-translate-y-0.5',
      secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/20',
      ghost: 'text-white/60 hover:text-white hover:bg-white/5',
      outline: 'border border-white/20 hover:border-white/40 text-white hover:bg-white/5',
      sizes: {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
      },
    },
    card: {
      base: 'bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6',
      hover: 'transition-all duration-300 hover:bg-white/[0.05] hover:border-white/20 hover:-translate-y-1',
      glow: 'hover:shadow-[0_0_40px_rgba(124,58,237,0.15)]',
    },
    input: {
      base: 'w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 transition-all duration-200',
      focus: 'focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 focus:bg-white/[0.07]',
      error: 'border-red-500/50 focus:ring-red-500/50',
    },
    badge: {
      base: 'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium',
      primary: 'bg-violet-500/20 border border-violet-500/30 text-violet-300',
      success: 'bg-green-500/20 border border-green-500/30 text-green-300',
      warning: 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-300',
      error: 'bg-red-500/20 border border-red-500/30 text-red-300',
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // LAYOUT
  // ═══════════════════════════════════════════════════════════════
  layout: {
    container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    section: 'py-20',
    header: 'h-16 fixed top-0 left-0 right-0 z-50',
    sidebar: 'w-64',
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // FORBIDDEN PATTERNS (Quality Gates)
  // ═══════════════════════════════════════════════════════════════
  forbidden: {
    colors: ['bg-blue-500', 'bg-blue-600', 'bg-gray-500', 'bg-indigo-500'],
    patterns: [
      'onClick={() => {}}',  // Empty handler
      'href="#"',            // Dead link
      'console.log',         // Debug code
    ],
    missingTransitions: 'hover: without transition',
  },
};

export type DesignSystem = typeof DESIGN_SYSTEM;
```

---

# IMPLEMENTATION CHECKLIST

## Phase 0: Foundation (16 hours)

```
□ RAG System
  □ Install Qdrant: docker run -p 6333:6333 qdrant/qdrant
  □ Create /src/lib/agents/rag/component-store.ts
  □ Create /src/lib/agents/rag/embedder.ts
  □ Create /src/lib/agents/rag/retriever.ts
  □ Seed with 50+ example components
  □ Test retrieval accuracy

□ Vision Pipeline
  □ Install Playwright: npm install playwright
  □ Create /src/lib/agents/vision/renderer.ts
  □ Create /src/lib/agents/vision/comparator.ts
  □ Test component rendering
  □ Test visual comparison

□ Design System
  □ Create /src/lib/agents/design-system.ts
  □ Add all tokens
  □ Add forbidden patterns
```

## Phase 1: Agent Pipeline (12 hours)

```
□ Pipeline Agents
  □ Create /src/lib/agents/registry/pipeline.ts
  □ Define PLANNER agent
  □ Define DESIGNER agent
  □ Define CODER agent
  □ Define REVIEWER agent
  □ Define FIXER agent

□ Context Assembler
  □ Create /src/lib/agents/context/assembler.ts
  □ Implement RAG injection
  □ Implement few-shot injection
  □ Implement token optimization
```

## Phase 2: Orchestration (12 hours)

```
□ Iteration Loop
  □ Create /src/lib/agents/orchestrator/iteration-loop.ts
  □ Implement retry logic
  □ Implement feedback passing
  □ Test with quality threshold

□ Pipeline Orchestrator
  □ Create /src/lib/agents/orchestrator/pipeline-orchestrator.ts
  □ Implement full pipeline
  □ Add RAG learning (save good outputs)
  □ Add logging and metrics
```

## Phase 3: Testing (12 hours)

```
□ Unit Tests
  □ Test RAG retrieval
  □ Test vision comparison
  □ Test context assembly
  □ Test iteration loop

□ Integration Tests
  □ Run full pipeline on simple component
  □ Run full pipeline on complex page
  □ Verify output quality
  □ Compare before/after (old vs new agents)

□ Quality Benchmarks
  □ Generate 10 components
  □ Score each with vision
  □ Average score must be >= 85
  □ Document improvements
```

---

# SUCCESS METRICS

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Average quality score | ~50 | >= 85 | Vision comparison |
| Brand color usage | 0% | 100% | Regex check for violet/purple |
| Animation coverage | 20% | 100% | Count transition/hover classes |
| First-attempt success | 10% | 60% | Score >= 85 on iteration 1 |
| RAG hit rate | 0% | 80% | Similar components found |
| Iteration count avg | 1 | 1.5 | Track in orchestrator |

---

# ESTIMATED TOTAL EFFORT

| Phase | Hours | Priority |
|-------|-------|----------|
| RAG System | 8 | 🔴 CRITICAL |
| Vision Pipeline | 8 | 🔴 CRITICAL |
| Agent Pipeline | 12 | 🔴 CRITICAL |
| Orchestration | 12 | 🔴 CRITICAL |
| Testing | 12 | 🟡 HIGH |
| **TOTAL** | **52** | |

---

# NEXT STEPS

1. **Approve this plan**
2. **Start with RAG** (highest impact)
3. **Add vision validation** (enables iteration)
4. **Implement pipeline agents** (chain-of-thought)
5. **Build orchestrator** (ties it together)
6. **Test and iterate**

**This architecture will produce agents that rival Vercel v0, Lovable, and Bolt.**

Ready to build?

/**
 * OLYMPUS 2.1 - UX_CRITIC Agent
 *
 * The ONLY AI agent in the validation pipeline.
 * Runs AFTER all code validators pass.
 *
 * Purpose: Comparative judgment against elite products (taste).
 * Philosophy: "Technically valid ≠ good"
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface UXCriticInput {
  code: string;
  pageType: string;
  description: string;
  screenshots?: string[];
}

export interface UXCriticScore {
  score: number;
  reasoning: string;
}

export interface UXCriticConcern {
  severity: 'high' | 'medium' | 'low';
  screen: string;
  observation: string;
  problem: string;
  evidence: string;
  recommendation: string;
}

export interface UXCriticResult {
  verdict: 'APPROVED' | 'NEEDS_WORK' | 'REJECTED';
  overallScore: number;
  benchmark: string;
  scores: {
    clarity: UXCriticScore;
    efficiency: UXCriticScore;
    simplicity: UXCriticScore;
    trust: UXCriticScore;
  };
  praise: string[];
  concerns: UXCriticConcern[];
  verdictReasoning: string;
}

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  phase: string;
  tier: string;
  dependencies: string[];
  optional: boolean;
  systemPrompt: string;
  outputSchema: object;
  maxRetries: number;
  timeout: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BENCHMARK DEFINITION (50X UPGRADE)
// ═══════════════════════════════════════════════════════════════════════════════

export interface BenchmarkDefinition {
  /** Product name (e.g., "Stripe", "Linear") */
  name: string;
  /** Key traits that define this product's UX */
  traits: readonly string[];
  /** Measurable metrics */
  metrics: Record<string, number | string | boolean>;
  /** Production-quality code example showing the pattern */
  coreExample: string;
  /** Patterns that should be present (✓ prefix) */
  keyPatterns: readonly string[];
  /** Anti-patterns to reject (❌ prefix) */
  antiPatterns: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED BENCHMARKS (50X UPGRADE - WITH CODE)
// ═══════════════════════════════════════════════════════════════════════════════

export const BENCHMARKS = {
  payment: {
    name: 'Stripe',
    traits: ['Clean checkout', '3-step max', 'Clear pricing', 'Trust signals', 'Combined card input'],
    metrics: { checkoutSteps: 3, formFieldsPerStep: 4, errorRecoveryClicks: 1 },

    coreExample: `// STRIPE PATTERN: Checkout Form
<form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
  <div className="space-y-1.5">
    <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
    <input id="email" type="email" placeholder="you@example.com"
           className="w-full px-3 py-2.5 border border-gray-300 rounded-md
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
  </div>

  {/* Combined Card Input - Stripe's signature pattern */}
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-gray-700">Card information</label>
    <div className="border border-gray-300 rounded-md overflow-hidden
                    focus-within:ring-2 focus-within:ring-blue-500">
      <input placeholder="1234 1234 1234 1234"
             className="w-full px-3 py-2.5 border-0 border-b border-gray-300 focus:ring-0" />
      <div className="flex">
        <input placeholder="MM / YY" className="w-1/2 px-3 py-2.5 border-0 border-r focus:ring-0" />
        <input placeholder="CVC" className="w-1/2 px-3 py-2.5 border-0 focus:ring-0" />
      </div>
    </div>
  </div>

  <button type="submit" className="w-full py-3 bg-blue-600 text-white font-medium rounded-md
                                   hover:bg-blue-700 disabled:opacity-50">
    {isLoading ? 'Processing...' : \`Pay $\${amount.toFixed(2)}\`}
  </button>

  <p className="text-center text-xs text-gray-500">
    <Lock className="inline w-3 h-3 mr-1" /> Payments are secure and encrypted
  </p>
</form>`,

    keyPatterns: [
      '✓ Single column layout',
      '✓ Combined card input (number/expiry/CVC in one container)',
      '✓ Price in CTA button ("Pay $99.00")',
      '✓ Trust signals at bottom',
    ],
    antiPatterns: [
      '❌ Generic "Submit" button',
      '❌ Separate bordered inputs for card fields',
      '❌ Two-column layout for payment',
    ],
  },

  projectManagement: {
    name: 'Linear',
    traits: ['Keyboard-first', 'Dark theme', 'Compact spacing', 'Command palette', 'Minimal chrome'],
    metrics: { keyboardShortcuts: true, loadingStateMaxDuration: 200, actionsPerClick: 1 },

    coreExample: `// LINEAR PATTERN: Sidebar Navigation
<aside className="w-64 h-screen bg-gray-900 text-gray-100 flex flex-col">
  <div className="p-3 border-b border-gray-800">
    <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-800">
      <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-500 to-pink-500
                      flex items-center justify-center text-xs font-bold">A</div>
      <span className="font-medium text-sm">Acme Inc</span>
      <ChevronDown className="w-4 h-4 ml-auto text-gray-500" />
    </button>
  </div>

  <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
    <a className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-gray-800 text-white">
      <Inbox className="w-4 h-4" />
      <span className="text-sm">Inbox</span>
      <span className="ml-auto px-1.5 py-0.5 text-xs bg-blue-600 rounded-full">12</span>
    </a>

    <a className="group flex items-center gap-2 px-2 py-1.5 rounded-md
                  text-gray-400 hover:bg-gray-800 hover:text-white">
      <List className="w-4 h-4" />
      <span className="text-sm">My Issues</span>
      <kbd className="ml-auto hidden group-hover:inline text-[10px] text-gray-500 bg-gray-800 px-1 rounded">G I</kbd>
    </a>
  </nav>

  <div className="p-2 border-t border-gray-800">
    <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md
                       text-gray-500 hover:bg-gray-800 hover:text-white">
      <Plus className="w-4 h-4" />
      <span className="text-sm">New Issue</span>
      <kbd className="ml-auto text-[10px] text-gray-600 bg-gray-800 px-1.5 rounded">C</kbd>
    </button>
  </div>
</aside>`,

    keyPatterns: [
      '✓ Dark theme (bg-gray-900)',
      '✓ Compact spacing (py-1.5, gap-2)',
      '✓ Keyboard shortcuts on hover',
      '✓ Badge counts right-aligned',
    ],
    antiPatterns: [
      '❌ Light theme for dev tools',
      '❌ Large padding (py-4, gap-4)',
      '❌ No keyboard hints',
    ],
  },

  productivity: {
    name: 'Notion',
    traits: ['Block-based', 'Clean typography', 'Minimal chrome', 'Inline editing', 'Slash commands'],
    metrics: { contentToChrome: 0.9, nestingLevels: 5 },

    coreExample: `// NOTION PATTERN: Page Layout
<div className="min-h-screen bg-white">
  <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100">
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500">
      <nav className="flex items-center gap-1">
        <span className="hover:bg-gray-100 px-1.5 py-0.5 rounded cursor-pointer">Workspace</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-900">Current Page</span>
      </nav>
    </div>
  </header>

  <main className="max-w-3xl mx-auto px-6 py-12">
    <div className="mb-8">
      <span className="text-5xl mb-4 block">📋</span>
      <h1 className="text-4xl font-bold text-gray-900 outline-none"
          contentEditable suppressContentEditableWarning>
        Project Overview
      </h1>
    </div>

    <div className="space-y-1 text-gray-700 leading-relaxed">
      <p className="text-lg">
        Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-sm">/</kbd> for commands
      </p>

      <div className="group relative -ml-6 pl-6">
        <div className="absolute left-0 top-1 opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
          <button className="p-0.5 hover:bg-gray-100 rounded">
            <GripVertical className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <p>Hover to see block controls.</p>
      </div>
    </div>
  </main>
</div>`,

    keyPatterns: [
      '✓ Content-first (max-w-3xl, py-12)',
      '✓ Minimal chrome (subtle header)',
      '✓ Inline editing (contentEditable)',
      '✓ Block hover controls',
    ],
    antiPatterns: [
      '❌ Heavy sidebars always visible',
      '❌ No inline editing',
      '❌ Controls always visible',
    ],
  },

  devTools: {
    name: 'Vercel',
    traits: ['Dark theme', 'Technical precision', 'Status clarity', 'Fast feedback', 'Monospace details'],
    metrics: { deploymentStatus: 'always-visible', errorMessages: 'actionable' },

    coreExample: `// VERCEL PATTERN: Deployment Card
<div className="bg-black text-white rounded-lg border border-gray-800 overflow-hidden">
  <div className="flex items-center justify-between p-4 border-b border-gray-800">
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-75" />
      </div>
      <div>
        <h3 className="font-medium">Production Deployment</h3>
        <p className="text-sm text-gray-400">Ready</p>
      </div>
    </div>
    <button className="px-3 py-1.5 text-sm bg-white text-black rounded-md hover:bg-gray-200 font-medium">
      Visit
    </button>
  </div>

  <div className="p-4 space-y-3 text-sm">
    <div className="flex items-center justify-between">
      <span className="text-gray-400">Domain</span>
      <code className="font-mono text-gray-200">acme.vercel.app</code>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-gray-400">Branch</span>
      <code className="font-mono text-gray-200">main</code>
    </div>
  </div>

  <div className="px-4 py-3 bg-gray-900/50 border-t border-gray-800">
    <p className="text-xs text-gray-500">Deployed 2m ago by <span className="text-gray-400">@johndoe</span></p>
  </div>
</div>`,

    keyPatterns: [
      '✓ Dark theme (bg-black)',
      '✓ Animated status indicator',
      '✓ Monospace for technical values',
      '✓ High contrast CTA',
    ],
    antiPatterns: [
      '❌ Light theme for deployment UI',
      '❌ Sans-serif for technical values',
      '❌ No status animation',
    ],
  },

  consumer: {
    name: 'Apple',
    traits: ['Premium feel', 'White space', 'Hero focus', 'Minimal options', 'Typography hierarchy'],
    metrics: { ctaPerPage: 1, heroImageQuality: 'high' },

    coreExample: `// APPLE PATTERN: Hero Section
<section className="min-h-screen flex flex-col items-center justify-center px-6 py-24 bg-white">
  <p className="text-xl text-gray-500 mb-4">MacBook Pro</p>

  <h1 className="text-5xl md:text-7xl font-semibold text-gray-900 text-center max-w-4xl
                 tracking-tight leading-tight">
    Supercharged for pros.
  </h1>

  <p className="mt-6 text-xl md:text-2xl text-gray-500 text-center max-w-2xl">
    The most powerful MacBook Pro ever is here.
  </p>

  <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
    <a href="#" className="text-xl text-blue-600 hover:underline">Learn more →</a>
    <a href="#" className="text-xl text-blue-600 hover:underline">Buy →</a>
  </div>

  <div className="mt-16 w-full max-w-5xl">
    <img src="/hero.jpg" alt="MacBook Pro" className="w-full h-auto" />
  </div>
</section>`,

    keyPatterns: [
      '✓ Massive typography (text-5xl to text-7xl)',
      '✓ Generous whitespace (min-h-screen, py-24)',
      '✓ Text links as CTAs',
      '✓ Single focus',
    ],
    antiPatterns: [
      '❌ Heavy button CTAs',
      '❌ Small typography for headlines',
      '❌ Cramped spacing',
    ],
  },

  ecommerce: {
    name: 'Shopify',
    traits: ['Product focus', 'Quick checkout', 'Trust badges', 'Mobile-first', 'Cart preview'],
    metrics: { productImageSize: 'large', addToCartClicks: 1, checkoutFields: 6 },

    coreExample: `// SHOPIFY PATTERN: Product Card
<div className="group bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
  <div className="relative aspect-square bg-gray-100">
    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />

    {product.onSale && (
      <span className="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
        Sale
      </span>
    )}

    <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
      <button className="w-full py-2.5 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800">
        Quick Add
      </button>
    </div>
  </div>

  <div className="p-4">
    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{product.vendor}</p>
    <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{product.name}</h3>

    <div className="flex items-center gap-2">
      {product.onSale ? (
        <>
          <span className="font-semibold text-red-600">\${product.salePrice}</span>
          <span className="text-sm text-gray-400 line-through">\${product.price}</span>
        </>
      ) : (
        <span className="font-semibold text-gray-900">\${product.price}</span>
      )}
    </div>

    <div className="flex items-center gap-1 mt-2">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className={\`w-4 h-4 \${i < product.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}\`} />
      ))}
      <span className="text-xs text-gray-500 ml-1">({product.reviews})</span>
    </div>
  </div>
</div>`,

    keyPatterns: [
      '✓ Aspect-square images',
      '✓ Quick Add on hover',
      '✓ Sale badge top-left',
      '✓ Price prominence (sale in red)',
      '✓ Star ratings',
    ],
    antiPatterns: [
      '❌ Small product images',
      '❌ Always-visible Add button',
      '❌ No social proof',
    ],
  },

  analytics: {
    name: 'Mixpanel',
    traits: ['Data visualization', 'Drill-down', 'Clear metrics', 'Exportable'],
    metrics: { chartsPerDashboard: 6, interactiveCharts: true },

    coreExample: `// MIXPANEL PATTERN: Metric Card
<div className="bg-white rounded-lg border border-gray-200 p-6">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-sm font-medium text-gray-500">Active Users</h3>
    <select className="text-xs border-0 text-gray-500 bg-transparent">
      <option>Last 7 days</option>
      <option>Last 30 days</option>
    </select>
  </div>

  <div className="flex items-baseline gap-2">
    <span className="text-3xl font-semibold text-gray-900">12,453</span>
    <span className="text-sm text-green-600 flex items-center gap-1">
      <ArrowUp className="w-3 h-3" /> 12.5%
    </span>
  </div>

  <div className="mt-4 h-16">
    <svg className="w-full h-full" viewBox="0 0 100 40">
      <path d="M0,30 L20,25 L40,28 L60,15 L80,18 L100,10"
            fill="none" stroke="#3b82f6" strokeWidth="2" />
    </svg>
  </div>
</div>`,

    keyPatterns: [
      '✓ Large metric value (text-3xl)',
      '✓ Trend indicator with color',
      '✓ Time range selector',
      '✓ Sparkline visualization',
    ],
    antiPatterns: [
      '❌ Small metric text',
      '❌ No trend indicator',
      '❌ No time context',
    ],
  },
} as const;

// Benchmark key type
export type BenchmarkKey = keyof typeof BENCHMARKS;

// ═══════════════════════════════════════════════════════════════════════════════
// EVALUATION FRAMEWORK
// ═══════════════════════════════════════════════════════════════════════════════

export const EVALUATION_CRITERIA = {
  clarity: {
    weight: 0.30,
    questions: [
      'Is the purpose obvious within 3 seconds?',
      'Can a new user complete the primary action without instructions?',
      'Are labels clear and action-oriented?',
      'Is the visual hierarchy correct?',
    ],
  },
  efficiency: {
    weight: 0.25,
    questions: [
      'Is this the shortest path to the goal?',
      'Are there unnecessary steps that can be removed?',
      'Can any form fields be auto-filled or removed?',
      'Is information available when needed?',
    ],
  },
  simplicity: {
    weight: 0.25,
    questions: [
      'Can any element be removed without losing function?',
      'Is there visual noise that doesn\'t serve a purpose?',
      'Are there too many choices competing for attention?',
      'Is the cognitive load appropriate for the task?',
    ],
  },
  trust: {
    weight: 0.20,
    questions: [
      'Does this look professional/legitimate?',
      'Would this pass the screenshot test?',
      'Are prices, terms, and actions clearly visible?',
      'Does it feel polished or rushed?',
    ],
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// REJECTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

export const INSTANT_REJECTION_PATTERNS = [
  'Cognitive overload (too much information at once)',
  'Buried primary action (user can\'t find main CTA)',
  'Ambiguous labels ("Submit", "Continue" without context)',
  'Fear-inducing error states (scary red, no recovery path)',
  'Dark patterns (hidden costs, confusing unsubscribe)',
  'Dead ends (no navigation, no next action)',
  'Competing CTAs (multiple primary buttons)',
] as const;

export const STRONG_CONCERN_PATTERNS = [
  'Generic feeling ("could be any app")',
  'Inconsistent visual language within same page',
  'Walls of text without structure',
  'Too many steps for simple action',
  'Important information below the fold',
  'Missing loading states',
  'Missing error states',
  'Missing empty states',
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Get benchmark for page type
// ═══════════════════════════════════════════════════════════════════════════════

export function getBenchmarkForPageType(pageType: string): BenchmarkKey {
  const mapping: Record<string, BenchmarkKey> = {
    // Payment
    checkout: 'payment',
    payment: 'payment',
    billing: 'payment',
    pricing: 'payment',
    subscribe: 'payment',

    // Project Management
    project: 'projectManagement',
    projects: 'projectManagement',
    issues: 'projectManagement',
    tasks: 'projectManagement',
    kanban: 'projectManagement',
    board: 'projectManagement',

    // Productivity
    docs: 'productivity',
    notes: 'productivity',
    wiki: 'productivity',
    editor: 'productivity',
    content: 'productivity',

    // Dev Tools
    dashboard: 'devTools',
    deploy: 'devTools',
    logs: 'devTools',
    settings: 'devTools',
    config: 'devTools',
    admin: 'devTools',

    // Consumer
    landing: 'consumer',
    hero: 'consumer',
    marketing: 'consumer',
    home: 'consumer',

    // E-commerce
    product: 'ecommerce',
    cart: 'ecommerce',
    shop: 'ecommerce',
    store: 'ecommerce',
    catalog: 'ecommerce',

    // Analytics
    analytics: 'analytics',
    reports: 'analytics',
    metrics: 'analytics',
    insights: 'analytics',
  };

  // Use PARTIAL matching (same as original) to handle compound types like "checkout-flow"
  const lower = pageType.toLowerCase();
  for (const [key, value] of Object.entries(mapping)) {
    if (lower.includes(key)) return value;
  }
  return 'consumer'; // Default to Apple-style
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Format benchmark for UX_CRITIC prompt
// ═══════════════════════════════════════════════════════════════════════════════

export function formatBenchmarkForCritic(pageType: string): string {
  const benchmarkKey = getBenchmarkForPageType(pageType);
  const benchmark = BENCHMARKS[benchmarkKey];

  return `
## BENCHMARK: ${benchmark.name}

### Expected Traits
${benchmark.traits.map(t => `- ${t}`).join('\n')}

### Reference Implementation (What GOOD looks like)
\`\`\`tsx
${benchmark.coreExample}
\`\`\`

### Patterns to Verify
${benchmark.keyPatterns.join('\n')}

### Anti-Patterns to Reject
${benchmark.antiPatterns.join('\n')}
`;
}

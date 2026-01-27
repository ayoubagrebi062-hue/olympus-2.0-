/**
 * OLYMPUS 2.1 - ARCHITECTURE BLUEPRINT
 * Stack Tokens - Locked Technology Choices
 * 
 * Philosophy: "One blessed stack. No exceptions."
 * 
 * ARCHON agent MUST output only these technologies.
 * Any deviation is a validation failure.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// THE BLESSED STACK (LOCKED)
// ═══════════════════════════════════════════════════════════════════════════════

export const BLESSED_STACK = {
  framework: {
    name: 'Next.js',
    version: '14+',
    router: 'App Router',
    features: ['Server Components', 'Server Actions', 'Route Handlers', 'Middleware'],
  },
  database: {
    provider: 'Supabase',
    engine: 'PostgreSQL',
    orm: 'Prisma',
    features: ['RLS', 'Realtime', 'Edge Functions', 'Database Webhooks'],
  },
  auth: {
    provider: 'Supabase Auth',
    methods: ['email', 'magic_link', 'oauth_google', 'oauth_github'],
    token: 'JWT',
    storage: 'httpOnly cookie',
  },
  storage: {
    provider: 'Supabase Storage',
    cdn: 'Supabase CDN',
    features: ['RLS policies', 'Signed URLs', 'Transformations'],
  },
  cache: {
    provider: 'Upstash Redis',
    features: ['Rate limiting', 'Session cache', 'Job queues'],
  },
  state: {
    client: 'Zustand',
    server: 'React Server Components',
    async: 'TanStack Query (optional)',
  },
  hosting: {
    primary: 'Vercel',
    features: ['Edge Functions', 'Analytics', 'Speed Insights'],
  },
  styling: {
    framework: 'Tailwind CSS',
    components: 'shadcn/ui',
    icons: 'Lucide React',
    animation: 'Framer Motion',
    charts: 'Recharts',
  },
  validation: {
    schema: 'Zod',
    forms: 'React Hook Form + Zod',
  },
  testing: {
    unit: 'Vitest',
    e2e: 'Playwright',
    components: 'Testing Library',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// FORBIDDEN TECHNOLOGIES
// ═══════════════════════════════════════════════════════════════════════════════

export const FORBIDDEN_TECHNOLOGIES = {
  frameworks: [
    'Express.js',
    'Fastify',
    'NestJS',
    'Hono',
    'Pages Router', // Next.js Pages Router
  ],
  databases: [
    'MySQL',
    'SQLite',
    'MongoDB',
    'Firebase Firestore',
    'PlanetScale',
    'CockroachDB',
  ],
  orms: [
    'TypeORM',
    'Sequelize',
    'Knex',
    'Drizzle', // Good but not our choice
    'Raw SQL strings',
  ],
  auth: [
    'NextAuth', // Use Supabase Auth
    'Clerk',
    'Auth0',
    'Firebase Auth',
    'Passport.js',
    'localStorage for tokens',
    'sessionStorage for tokens',
  ],
  storage: [
    'AWS S3 direct', // Use Supabase Storage
    'Cloudinary',
    'Firebase Storage',
    'Vercel Blob',
  ],
  state: [
    'Redux',
    'MobX',
    'Recoil',
    'Jotai',
    'XState', // Allowed for specific complex flows
  ],
  styling: [
    'Styled Components',
    'Emotion',
    'CSS Modules',
    'Sass/SCSS files',
    'Vanilla CSS files',
  ],
  languages: [
    'PHP',
    'Ruby',
    'Python backend',
    'Java',
    'Go',
  ],
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// APPROVED DEPENDENCIES (NPM Packages)
// ═══════════════════════════════════════════════════════════════════════════════

export const APPROVED_DEPENDENCIES = {
  // Core (always include)
  core: [
    'next',
    'react',
    'react-dom',
    '@supabase/supabase-js',
    '@supabase/ssr',
    'prisma',
    '@prisma/client',
  ],

  // Styling (always include)
  styling: [
    'tailwindcss',
    'postcss',
    'autoprefixer',
    'class-variance-authority',
    'clsx',
    'tailwind-merge',
    'lucide-react',
    'framer-motion',
    'recharts',
  ],

  // State & Data
  state: [
    'zustand',
    '@tanstack/react-query', // Optional
    'swr', // Alternative to TanStack Query
  ],

  // Forms & Validation
  forms: [
    'zod',
    'react-hook-form',
    '@hookform/resolvers',
  ],

  // Utilities
  utilities: [
    'date-fns',
    'nanoid',
    'lodash-es', // Tree-shakeable
    'ky', // HTTP client
  ],

  // Payments
  payments: [
    '@stripe/stripe-js',
    'stripe',
  ],

  // AI (when needed)
  ai: [
    '@anthropic-ai/sdk',
    'openai',
    'ai', // Vercel AI SDK
  ],

  // Dev dependencies
  dev: [
    'typescript',
    '@types/react',
    '@types/node',
    'eslint',
    'eslint-config-next',
    'prettier',
    'vitest',
    '@playwright/test',
    '@testing-library/react',
  ],
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// FILE STORAGE RULES
// ═══════════════════════════════════════════════════════════════════════════════

export const FILE_STORAGE_RULES = {
  provider: 'Supabase Storage',

  limits: {
    images: {
      maxSize: 5 * 1024 * 1024, // 5 MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    },
    documents: {
      maxSize: 10 * 1024 * 1024, // 10 MB
      allowedTypes: ['application/pdf', 'text/plain', 'text/csv'],
    },
    videos: {
      maxSize: 50 * 1024 * 1024, // 50 MB
      allowedTypes: ['video/mp4', 'video/webm'],
      enabled: false, // Disabled by default
    },
  },

  quotas: {
    starter: 1 * 1024 * 1024 * 1024,    // 1 GB
    pro: 10 * 1024 * 1024 * 1024,       // 10 GB
    enterprise: 100 * 1024 * 1024 * 1024, // 100 GB
  },

  banned: [
    '.exe', '.sh', '.bat', '.cmd', '.ps1', // Executables
    '.zip', '.tar', '.gz', '.rar', '.7z',  // Archives
    '.svg', // XSS risk
    '.html', '.htm', // XSS risk
    '.js', '.ts', // Code injection
  ],

  structure: `
    /{tenant_id}/
    ├── avatars/{user_id}.webp
    ├── uploads/{uuid}.{ext}
    └── exports/{uuid}.csv
  `,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ENVIRONMENT VARIABLES
// ═══════════════════════════════════════════════════════════════════════════════

export const ENV_VAR_RULES = {
  // Naming conventions
  conventions: {
    clientExposed: 'NEXT_PUBLIC_*',
    secretKeys: '*_SECRET_KEY or *_API_KEY',
    urls: '*_URL',
    tokens: '*_TOKEN',
    booleans: '*_ENABLED',
    case: 'SCREAMING_SNAKE_CASE',
  },

  // Required variables
  required: [
    // Supabase
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',

    // App
    'NEXT_PUBLIC_APP_URL',
  ],

  // Optional but common
  optional: [
    // Stripe
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',

    // AI Providers
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',

    // Redis
    'UPSTASH_REDIS_URL',
    'UPSTASH_REDIS_TOKEN',

    // Feature flags
    'FEATURE_MFA_ENABLED',
    'FEATURE_VIDEO_UPLOAD',
  ],

  // Never expose these (server only)
  serverOnly: [
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    '*_SECRET*',
    '*_PRIVATE*',
  ],
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function isApprovedDependency(packageName: string): boolean {
  const allApproved = [
    ...APPROVED_DEPENDENCIES.core,
    ...APPROVED_DEPENDENCIES.styling,
    ...APPROVED_DEPENDENCIES.state,
    ...APPROVED_DEPENDENCIES.forms,
    ...APPROVED_DEPENDENCIES.utilities,
    ...APPROVED_DEPENDENCIES.payments,
    ...APPROVED_DEPENDENCIES.ai,
    ...APPROVED_DEPENDENCIES.dev,
  ];
  return (allApproved as readonly string[]).includes(packageName);
}

export function isForbiddenTechnology(name: string): boolean {
  const allForbidden = [
    ...FORBIDDEN_TECHNOLOGIES.frameworks,
    ...FORBIDDEN_TECHNOLOGIES.databases,
    ...FORBIDDEN_TECHNOLOGIES.orms,
    ...FORBIDDEN_TECHNOLOGIES.auth,
    ...FORBIDDEN_TECHNOLOGIES.storage,
    ...FORBIDDEN_TECHNOLOGIES.state,
    ...FORBIDDEN_TECHNOLOGIES.styling,
    ...FORBIDDEN_TECHNOLOGIES.languages,
  ];
  return allForbidden.some(f => 
    name.toLowerCase().includes(f.toLowerCase())
  );
}

export function isAllowedFileType(mimeType: string, category: 'images' | 'documents' | 'videos'): boolean {
  const rules = FILE_STORAGE_RULES.limits[category];
  if (!rules) return false;
  if (category === 'videos' && !FILE_STORAGE_RULES.limits.videos.enabled) return false;
  return (rules.allowedTypes as readonly string[]).includes(mimeType);
}

export function isFileSizeAllowed(sizeBytes: number, category: 'images' | 'documents' | 'videos'): boolean {
  const rules = FILE_STORAGE_RULES.limits[category];
  if (!rules) return false;
  return sizeBytes <= rules.maxSize;
}

export function isBannedFileExtension(filename: string): boolean {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  return (FILE_STORAGE_RULES.banned as readonly string[]).includes(ext as string);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHON OUTPUT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export interface ArchonOutput {
  tech_stack: {
    framework: 'Next.js 14 App Router';
    database: 'Supabase PostgreSQL';
    orm: 'Prisma';
    auth: 'Supabase Auth';
    cache: 'Upstash Redis';
    state: 'Zustand';
    hosting: 'Vercel';
    styling: 'Tailwind CSS';
  };
  architecture: 'Monolith'; // Always monolith for MVP
  dependencies: string[];
  env_vars: {
    required: string[];
    optional: string[];
  };
  file_structure: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const STACK_TOKENS = {
  blessed: BLESSED_STACK,
  forbidden: FORBIDDEN_TECHNOLOGIES,
  approved: APPROVED_DEPENDENCIES,
  storage: FILE_STORAGE_RULES,
  env: ENV_VAR_RULES,
};

/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    OLYMPUS ROUTE SYSTEM v3.0                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  🚀 QUICK START: ADDING A NEW ROUTE (Copy-paste this)                       │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │  1. Add to ROUTE_TREE below:                                                │
 * │                                                                             │
 * │     myNewPage: {                                                            │
 * │       path: '/my-new-page',        // URL path                              │
 * │       title: 'My New Page',        // For breadcrumbs                       │
 * │       parent: 'dashboard',         // Parent route key (or null)            │
 * │       icon: 'file',                // Icon name (optional)                  │
 * │       auth: 'authenticated',       // 'public' | 'authenticated' | 'admin'  │
 * │     },                                                                      │
 * │                                                                             │
 * │  2. For dynamic routes, use :paramName:                                     │
 * │                                                                             │
 * │     myItem: {                                                               │
 * │       path: '/items/:itemId',      // :itemId becomes a required param      │
 * │       ...                                                                   │
 * │     },                                                                      │
 * │                                                                             │
 * │  3. Use in components:                                                      │
 * │                                                                             │
 * │     <AppLink to="myNewPage">Link</AppLink>                                  │
 * │     <AppLink to="myItem" itemId={id}>Link</AppLink>                         │
 * │                                                                             │
 * │  4. Create the page file:                                                   │
 * │                                                                             │
 * │     src/app/my-new-page/page.tsx                                            │
 * │     src/app/items/[itemId]/page.tsx                                         │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  📊 ROUTE HIERARCHY (Updated: 2026-01-22)                                   │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │  /                          (home)                                          │
 * │  ├── /login                 (login)                                         │
 * │  ├── /signup                (signup)                                        │
 * │  ├── /forgot-password       (forgotPassword)                                │
 * │  │                                                                          │
 * │  ├── /features              (features)                                      │
 * │  ├── /pricing               (pricing)                                       │
 * │  ├── /about                 (about)                                         │
 * │  ├── /contact               (contact)                                       │
 * │  ├── /demo                  (demo)                                          │
 * │  │                                                                          │
 * │  ├── /blog                  (blog)                                          │
 * │  │   └── /blog/:slug        (blogPost)                                      │
 * │  │                                                                          │
 * │  ├── /docs                  (docs)                                          │
 * │  │   ├── /docs/:slug        (docsPage)                                      │
 * │  │   └── /docs/category/:c  (docsCategory)                                  │
 * │  │                                                                          │
 * │  ├── /tutorials             (tutorials)                                     │
 * │  │   └── /tutorials/:slug   (tutorial)                                      │
 * │  │                                                                          │
 * │  ├── /dashboard             (dashboard) ← AUTHENTICATED                     │
 * │  │   ├── /projects          (projects)                                      │
 * │  │   │   └── /projects/:id  (project)                                       │
 * │  │   │       ├── /files     (projectFiles)                                  │
 * │  │   │       │   └── /:fid  (projectFile)                                   │
 * │  │   │       └── /settings  (projectSettings)                               │
 * │  │   │                                                                      │
 * │  │   ├── /builder           (builder)                                       │
 * │  │   │   └── /builder/:id   (builderProject)                                │
 * │  │   │                                                                      │
 * │  │   ├── /templates         (templates)                                     │
 * │  │   │   └── /templates/:id (template)                                      │
 * │  │   │       └── /use       (templateUse)                                   │
 * │  │   │                                                                      │
 * │  │   └── /settings          (settings)                                      │
 * │  │       ├── /account       (settingsAccount)                               │
 * │  │       ├── /billing       (settingsBilling)                               │
 * │  │       └── /security      (settingsSecurity)                              │
 * │  │                                                                          │
 * │  └── [Legal & Company pages...]                                             │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  📁 FILE STRUCTURE                                                          │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │  src/lib/routes/                                                            │
 * │  ├── index.ts          ← ROUTE_TREE + route builder + utilities (this file)│
 * │  └── components.tsx    ← AppLink, useRoute, useBreadcrumbs (React)          │
 * │                                                                             │
 * │  Usage in components:                                                       │
 * │  ├── import { route, routes, ROUTE_TREE } from '@/lib/routes'               │
 * │  └── import { AppLink, useRoute } from '@/lib/routes/components'            │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  📝 CHANGELOG                                                               │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │  v3.0 (2026-01-22) - World-Class Release                                    │
 * │  • Added AppLink component with type-safe props                             │
 * │  • Added useRoute, useBreadcrumbs, useNavigation hooks                      │
 * │  • Added 42 routes covering all pages                                       │
 * │                                                                             │
 * │  v2.1 (2026-01-22) - Security Hardening                                     │
 * │  • Fixed XSS in DevTools (escapeHtml)                                       │
 * │  • Fixed decodeURIComponent crash                                           │
 * │  • Added route specificity sorting                                          │
 * │  • Added CRLF/backslash injection prevention                                │
 * │                                                                             │
 * │  v2.0 (2026-01-22) - 10X Upgrade                                            │
 * │  • Route hierarchy for breadcrumbs                                          │
 * │  • DevTools panel (Ctrl+Shift+R)                                            │
 * │  • Navigation analytics                                                     │
 * │                                                                             │
 * │  v1.0 (2026-01-21) - Initial Release                                        │
 * │  • Type-safe route generation                                               │
 * │  • Basic route matching                                                     │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

// Security limits
const MAX_PARAM_LENGTH = 200;
const MAX_URL_LENGTH = 2000;

// Feature flags
const ANALYTICS_ENABLED = typeof window !== 'undefined';

// DevTools styling constants
const DEVTOOLS_Z_INDEX = 99999;
const DEVTOOLS_PANEL_HEIGHT = '300px';
const DEVTOOLS_SIDEBAR_WIDTH = '250px';
const DEVTOOLS_MOBILE_HEIGHT = '50vh';

// =============================================================================
// ROUTE HIERARCHY - The Source of Truth
// =============================================================================

/**
 * Route definitions with hierarchy for breadcrumbs.
 * parent: null = root route
 * parent: 'key' = child of that route
 */
export const ROUTE_TREE = {
  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC ROUTES - Marketing & Info
  // ─────────────────────────────────────────────────────────────────────────
  home: {
    path: '/',
    title: 'Home',
    parent: null,
    icon: 'home',
    auth: 'public' as const,
  },
  features: {
    path: '/features',
    title: 'Features',
    parent: null,
    icon: 'sparkles',
    auth: 'public' as const,
  },
  pricing: {
    path: '/pricing',
    title: 'Pricing',
    parent: null,
    icon: 'credit-card',
    auth: 'public' as const,
  },
  about: {
    path: '/about',
    title: 'About',
    parent: null,
    icon: 'info',
    auth: 'public' as const,
  },
  contact: {
    path: '/contact',
    title: 'Contact',
    parent: null,
    icon: 'mail',
    auth: 'public' as const,
  },
  demo: {
    path: '/demo',
    title: 'Demo',
    parent: null,
    icon: 'play',
    auth: 'public' as const,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC ROUTES - Auth
  // ─────────────────────────────────────────────────────────────────────────
  login: {
    path: '/login',
    title: 'Login',
    parent: null,
    icon: 'login',
    auth: 'public' as const,
  },
  signup: {
    path: '/signup',
    title: 'Sign Up',
    parent: null,
    icon: 'user-plus',
    auth: 'public' as const,
  },
  forgotPassword: {
    path: '/forgot-password',
    title: 'Forgot Password',
    parent: null,
    icon: 'key',
    auth: 'public' as const,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC ROUTES - Content
  // ─────────────────────────────────────────────────────────────────────────
  blog: {
    path: '/blog',
    title: 'Blog',
    parent: null,
    icon: 'newspaper',
    auth: 'public' as const,
  },
  blogPost: {
    path: '/blog/:slug',
    title: 'Blog Post',
    parent: 'blog',
    icon: 'file-text',
    auth: 'public' as const,
  },
  docs: {
    path: '/docs',
    title: 'Documentation',
    parent: null,
    icon: 'book',
    auth: 'public' as const,
  },
  docsPage: {
    path: '/docs/:slug',
    title: 'Doc Page',
    parent: 'docs',
    icon: 'file-text',
    auth: 'public' as const,
  },
  docsCategory: {
    path: '/docs/category/:category',
    title: 'Category',
    parent: 'docs',
    icon: 'folder',
    auth: 'public' as const,
  },
  tutorials: {
    path: '/tutorials',
    title: 'Tutorials',
    parent: null,
    icon: 'graduation-cap',
    auth: 'public' as const,
  },
  tutorial: {
    path: '/tutorials/:slug',
    title: 'Tutorial',
    parent: 'tutorials',
    icon: 'file-text',
    auth: 'public' as const,
  },
  apiDocs: {
    path: '/api-docs',
    title: 'API Documentation',
    parent: null,
    icon: 'code',
    auth: 'public' as const,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC ROUTES - Company
  // ─────────────────────────────────────────────────────────────────────────
  careers: {
    path: '/careers',
    title: 'Careers',
    parent: null,
    icon: 'briefcase',
    auth: 'public' as const,
  },
  careerJob: {
    path: '/careers/:id',
    title: 'Job Opening',
    parent: 'careers',
    icon: 'file-text',
    auth: 'public' as const,
  },
  partners: {
    path: '/partners',
    title: 'Partners',
    parent: null,
    icon: 'handshake',
    auth: 'public' as const,
  },
  press: {
    path: '/press',
    title: 'Press',
    parent: null,
    icon: 'newspaper',
    auth: 'public' as const,
  },
  community: {
    path: '/community',
    title: 'Community',
    parent: null,
    icon: 'users',
    auth: 'public' as const,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC ROUTES - Product Info
  // ─────────────────────────────────────────────────────────────────────────
  roadmap: {
    path: '/roadmap',
    title: 'Roadmap',
    parent: null,
    icon: 'map',
    auth: 'public' as const,
  },
  changelog: {
    path: '/changelog',
    title: 'Changelog',
    parent: null,
    icon: 'history',
    auth: 'public' as const,
  },
  status: {
    path: '/status',
    title: 'Status',
    parent: null,
    icon: 'activity',
    auth: 'public' as const,
  },
  featureRequest: {
    path: '/feature-request',
    title: 'Feature Request',
    parent: null,
    icon: 'lightbulb',
    auth: 'public' as const,
  },
  security: {
    path: '/security',
    title: 'Security',
    parent: null,
    icon: 'shield',
    auth: 'public' as const,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC ROUTES - Legal
  // ─────────────────────────────────────────────────────────────────────────
  privacy: {
    path: '/privacy',
    title: 'Privacy Policy',
    parent: null,
    icon: 'lock',
    auth: 'public' as const,
  },
  terms: {
    path: '/terms',
    title: 'Terms of Service',
    parent: null,
    icon: 'file-text',
    auth: 'public' as const,
  },
  cookies: {
    path: '/cookies',
    title: 'Cookie Policy',
    parent: null,
    icon: 'cookie',
    auth: 'public' as const,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────
  dashboard: {
    path: '/dashboard',
    title: 'Dashboard',
    parent: null,
    icon: 'layout-dashboard',
    auth: 'authenticated' as const,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PROJECTS
  // ─────────────────────────────────────────────────────────────────────────
  projects: {
    path: '/projects',
    title: 'Projects',
    parent: 'dashboard',
    icon: 'folder',
    auth: 'authenticated' as const,
  },
  project: {
    path: '/projects/:projectId',
    title: 'Project', // Will be replaced with actual name
    parent: 'projects',
    icon: 'folder-open',
    auth: 'authenticated' as const,
  },
  projectFiles: {
    path: '/projects/:projectId/files',
    title: 'Files',
    parent: 'project',
    icon: 'file',
    auth: 'authenticated' as const,
  },
  projectFile: {
    path: '/projects/:projectId/files/:fileId',
    title: 'File',
    parent: 'projectFiles',
    icon: 'file-code',
    auth: 'authenticated' as const,
  },
  projectSettings: {
    path: '/projects/:projectId/settings',
    title: 'Project Settings',
    parent: 'project',
    icon: 'settings',
    auth: 'authenticated' as const,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BUILDER
  // ─────────────────────────────────────────────────────────────────────────
  builder: {
    path: '/builder',
    title: 'Builder',
    parent: 'dashboard',
    icon: 'wand',
    auth: 'authenticated' as const,
  },
  builderProject: {
    path: '/builder/:projectId',
    title: 'Edit Project',
    parent: 'builder',
    icon: 'edit',
    auth: 'authenticated' as const,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TEMPLATES
  // ─────────────────────────────────────────────────────────────────────────
  templates: {
    path: '/templates',
    title: 'Templates',
    parent: 'dashboard',
    icon: 'layout-template',
    auth: 'authenticated' as const,
  },
  template: {
    path: '/templates/:templateId',
    title: 'Template',
    parent: 'templates',
    icon: 'layout',
    auth: 'authenticated' as const,
  },
  templateUse: {
    path: '/templates/:templateId/use',
    title: 'Use Template',
    parent: 'template',
    icon: 'rocket',
    auth: 'authenticated' as const,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SETTINGS
  // ─────────────────────────────────────────────────────────────────────────
  settings: {
    path: '/settings',
    title: 'Settings',
    parent: 'dashboard',
    icon: 'settings',
    auth: 'authenticated' as const,
  },
  settingsAccount: {
    path: '/settings/account',
    title: 'Account',
    parent: 'settings',
    icon: 'user',
    auth: 'authenticated' as const,
  },
  settingsBilling: {
    path: '/settings/billing',
    title: 'Billing',
    parent: 'settings',
    icon: 'credit-card',
    auth: 'authenticated' as const,
  },
  settingsSecurity: {
    path: '/settings/security',
    title: 'Security',
    parent: 'settings',
    icon: 'shield',
    auth: 'authenticated' as const,
  },
} as const;

export type RouteKey = keyof typeof ROUTE_TREE;
export type RouteAuth = 'public' | 'authenticated' | 'admin';

/**
 * Routes that don't require params (for navigation menus, etc.)
 * Filters out routes with :paramName in their path
 */
export type StaticRouteKey = {
  [K in RouteKey]: (typeof ROUTE_TREE)[K]['path'] extends `${string}:${string}` ? never : K;
}[RouteKey];

// =============================================================================
// SECURITY - Param Sanitization
// =============================================================================

const DANGEROUS_PATTERNS = [
  /\.\./, // Path traversal
  /%2e/i, // Encoded dot
  /[<>"']/, // XSS chars
  /%3c|%3e|%22|%27/i, // Encoded XSS
  /%00/, // Null byte
  /%0d|%0a/i, // CRLF injection
  /\.\\/, // Windows path traversal
  /%5c/i, // Encoded backslash
];

function sanitizeParam(value: unknown, name: string): string {
  if (value === null || value === undefined) {
    throw new Error(`[Route] Param "${name}" is required`);
  }

  // Type guard: Only accept strings and numbers (strict mode)
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`[Route] Param "${name}" must be a string or number, got ${typeof value}`);
  }

  const str = String(value);

  if (str.length === 0) {
    throw new Error(`[Route] Param "${name}" cannot be empty`);
  }

  if (str.length > MAX_PARAM_LENGTH) {
    throw new Error(`[Route] Param "${name}" exceeds max length (${MAX_PARAM_LENGTH})`);
  }

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(str)) {
      throw new Error(`[Route] Param "${name}" contains invalid characters`);
    }
  }

  return /^[a-zA-Z0-9_-]+$/.test(str) ? str : encodeURIComponent(str);
}

// =============================================================================
// TYPE HELPERS
// =============================================================================

/**
 * Extract param names from a route path string.
 * Uses recursive template literal types to find all :paramName patterns.
 *
 * @example
 * ExtractParams<'/projects/:projectId/files/:fileId'>
 * // Result: { projectId: string } & { fileId: string }
 *
 * ExtractParams<'/dashboard'>
 * // Result: Record<string, never> (empty object)
 */
type ExtractParams<T extends string> = T extends `${string}:${infer Param}/${infer Rest}`
  ? { [K in Param]: string } & ExtractParams<Rest>
  : T extends `${string}:${infer Param}`
    ? { [K in Param]: string }
    : Record<string, never>;

/**
 * Determine the function signature for a route.
 * Static routes: () => string
 * Dynamic routes: (params: {...}) => string
 */
type RouteFunction<T extends string> = keyof ExtractParams<T> extends never
  ? () => string
  : (params: ExtractParams<T>) => string;

/**
 * The complete route builder object type.
 * Maps each route key to its appropriate function signature.
 */
type RouteObject = {
  [K in RouteKey]: RouteFunction<(typeof ROUTE_TREE)[K]['path']>;
};

// =============================================================================
// PRE-COMPILED PATTERNS (Performance)
// =============================================================================

interface CompiledRoute {
  key: RouteKey;
  path: string;
  regex: RegExp;
  paramNames: string[];
  title: string;
  parent: RouteKey | null;
  auth: RouteAuth;
}

/**
 * Compiled routes sorted by specificity:
 * - Static routes first (no params)
 * - More segments = higher priority
 * - Fewer params = higher priority
 */
const COMPILED_ROUTES: CompiledRoute[] = Object.entries(ROUTE_TREE)
  .map(([key, def]) => {
    const paramNames = [...def.path.matchAll(/:(\w+)/g)].map(m => m[1]);
    const regexStr = def.path.replace(/:(\w+)/g, '([^/]+)');
    return {
      key: key as RouteKey,
      path: def.path,
      regex: new RegExp(`^${regexStr}$`),
      paramNames,
      title: def.title,
      parent: def.parent as RouteKey | null,
      auth: def.auth,
    };
  })
  .sort((a, b) => {
    // Static routes first
    const aStatic = a.paramNames.length === 0;
    const bStatic = b.paramNames.length === 0;
    if (aStatic && !bStatic) return -1;
    if (!aStatic && bStatic) return 1;

    // More segments = more specific
    const aSegments = a.path.split('/').length;
    const bSegments = b.path.split('/').length;
    if (aSegments !== bSegments) return bSegments - aSegments;

    // Fewer params = more specific
    return a.paramNames.length - b.paramNames.length;
  });

// =============================================================================
// ROUTE BUILDER
// =============================================================================

/**
 * Creates the type-safe route builder object.
 * Each route key becomes a function that generates the URL.
 */
function createRouteBuilder(): RouteObject {
  // We build this dynamically, so we need to cast at the end
  const builder: Record<string, (...args: unknown[]) => string> = {};

  for (const [key, def] of Object.entries(ROUTE_TREE)) {
    const hasParams = def.path.includes(':');

    if (hasParams) {
      // Dynamic route: requires params object
      builder[key] = (params: unknown) => {
        let url: string = def.path;
        for (const [paramKey, value] of Object.entries(params as Record<string, unknown>)) {
          const safe = sanitizeParam(value, paramKey);
          url = url.replace(`:${paramKey}`, safe);
        }
        // Verify all params were substituted
        if (url.includes(':')) {
          const missing = url.match(/:(\w+)/)?.[1];
          throw new Error(
            `[Route] Missing required param "${missing}" for route "${key}". ` +
              `Expected params: ${[...def.path.matchAll(/:(\w+)/g)].map(m => m[1]).join(', ')}`
          );
        }
        return url;
      };
    } else {
      // Static route: no params needed
      builder[key] = () => def.path;
    }
  }

  // The builder matches RouteObject's shape - TypeScript verified at call sites
  return builder as RouteObject;
}

/**
 * Generate type-safe URLs.
 *
 * @example
 * route.dashboard()                        // '/dashboard'
 * route.project({ projectId: 'abc' })      // '/projects/abc'
 * route.projectFile({ projectId: 'abc', fileId: 'xyz' })
 */
export const route = createRouteBuilder();

// =============================================================================
// ROUTE MATCHING
// =============================================================================

export interface RouteMatch {
  key: RouteKey;
  path: string;
  params: Record<string, string>;
  title: string;
  auth: RouteAuth;
}

function normalizePath(path: string): string {
  let clean = path.split('?')[0].split('#')[0];
  if (clean.length > 1 && clean.endsWith('/')) {
    clean = clean.slice(0, -1);
  }
  return clean;
}

/**
 * Match a URL path to a route.
 */
export function matchRoute(path: string): RouteMatch | null {
  if (typeof path !== 'string') return null;

  const cleanPath = normalizePath(path);
  if (cleanPath.length > MAX_URL_LENGTH) return null;

  for (const compiled of COMPILED_ROUTES) {
    const match = cleanPath.match(compiled.regex);
    if (match) {
      const params: Record<string, string> = {};
      try {
        compiled.paramNames.forEach((name, i) => {
          // Safe decode with fallback to raw value
          try {
            params[name] = decodeURIComponent(match[i + 1]);
          } catch {
            params[name] = match[i + 1]; // Fallback to raw if malformed
          }
        });
      } catch {
        return null; // Bail on any decode error
      }
      return {
        key: compiled.key,
        path: compiled.path,
        params,
        title: compiled.title,
        auth: compiled.auth,
      };
    }
  }

  return null;
}

// =============================================================================
// BREADCRUMBS - Auto-generated from hierarchy
// =============================================================================

export interface Breadcrumb {
  key: RouteKey;
  title: string;
  href: string;
  isLast: boolean;
}

/**
 * Generate breadcrumbs for a route.
 *
 * @example
 * getBreadcrumbs('/projects/abc/files/xyz')
 * // Returns:
 * // [
 * //   { key: 'dashboard', title: 'Dashboard', href: '/dashboard', isLast: false },
 * //   { key: 'projects', title: 'Projects', href: '/projects', isLast: false },
 * //   { key: 'project', title: 'Project', href: '/projects/abc', isLast: false },
 * //   { key: 'projectFiles', title: 'Files', href: '/projects/abc/files', isLast: false },
 * //   { key: 'projectFile', title: 'File', href: '/projects/abc/files/xyz', isLast: true },
 * // ]
 */
export function getBreadcrumbs(
  path: string,
  titleOverrides?: Record<string, string>
): Breadcrumb[] {
  const match = matchRoute(path);
  if (!match) return [];

  const breadcrumbs: Breadcrumb[] = [];
  let currentKey: RouteKey | null = match.key;
  const params = match.params;

  // Walk up the tree
  while (currentKey) {
    const routeDef = ROUTE_TREE[currentKey];
    const compiled = COMPILED_ROUTES.find(r => r.key === currentKey)!;

    // Build href with params
    let href: string = routeDef.path;
    for (const [paramKey, value] of Object.entries(params)) {
      href = href.replace(`:${paramKey}`, value);
    }

    // Get title (with override support)
    const title = titleOverrides?.[currentKey] || routeDef.title;

    breadcrumbs.unshift({
      key: currentKey,
      title,
      href,
      isLast: currentKey === match.key,
    });

    currentKey = compiled.parent;
  }

  return breadcrumbs;
}

// =============================================================================
// ROUTE UTILITIES
// =============================================================================

export const routes = {
  /**
   * Match a URL to a route.
   */
  match: matchRoute,

  /**
   * Check if a path matches a specific route.
   */
  is(path: string, routeKey: RouteKey): boolean {
    const match = matchRoute(path);
    return match?.key === routeKey;
  },

  /**
   * Check if a route is active (for nav highlighting).
   */
  isActive(targetPath: string, currentPath: string, matchChildren = false): boolean {
    const target = normalizePath(targetPath);
    const current = normalizePath(currentPath);

    if (matchChildren) {
      return current === target || current.startsWith(target + '/');
    }
    return current === target;
  },

  /**
   * Get route metadata.
   */
  getMeta(key: RouteKey) {
    return ROUTE_TREE[key];
  },

  /**
   * Get all routes requiring a specific auth level.
   */
  getByAuth(auth: RouteAuth): RouteKey[] {
    return Object.entries(ROUTE_TREE)
      .filter(([, def]) => def.auth === auth)
      .map(([key]) => key as RouteKey);
  },

  /**
   * Get all route keys.
   */
  keys(): RouteKey[] {
    return Object.keys(ROUTE_TREE) as RouteKey[];
  },

  /**
   * Generate breadcrumbs.
   */
  breadcrumbs: getBreadcrumbs,
};

// =============================================================================
// ANALYTICS - Navigation Tracking
// =============================================================================

interface NavigationEvent {
  from: string;
  to: string;
  routeKey: RouteKey | null;
  params: Record<string, string>;
  timestamp: number;
}

const navigationHistory: NavigationEvent[] = [];
const MAX_HISTORY = 50;

/**
 * Track a navigation event.
 */
export function trackNavigation(from: string, to: string): void {
  if (!ANALYTICS_ENABLED) return;

  const match = matchRoute(to);

  const event: NavigationEvent = {
    from,
    to,
    routeKey: match?.key ?? null,
    params: match?.params ?? {},
    timestamp: Date.now(),
  };

  navigationHistory.push(event);

  // Keep history bounded
  if (navigationHistory.length > MAX_HISTORY) {
    navigationHistory.shift();
  }

  // Dispatch custom event for analytics integrations
  window.dispatchEvent(new CustomEvent('olympus:navigate', { detail: event }));
}

/**
 * Get navigation history.
 */
export function getNavigationHistory(): NavigationEvent[] {
  return [...navigationHistory];
}

// =============================================================================
// DEV TOOLS - Visual Route Explorer (Development Only)
// =============================================================================

let devToolsInjected = false;

/**
 * Escape HTML to prevent XSS in DevTools.
 */
function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Inject the route DevTools panel.
 * Press Ctrl+Shift+R to toggle.
 * NOTE: Only works in development mode.
 */
export function injectDevTools(): void {
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV !== 'development') return;
  if (devToolsInjected) return;

  devToolsInjected = true;

  // Create panel
  const panel = document.createElement('div');
  panel.id = 'olympus-route-devtools';
  panel.innerHTML = `
    <style>
      #olympus-route-devtools {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 0;
        background: #0f0f17;
        border-top: 1px solid #2a2a3a;
        font-family: 'SF Mono', Monaco, monospace;
        font-size: 12px;
        color: #e0e0e0;
        z-index: ${DEVTOOLS_Z_INDEX};
        transition: height 0.3s ease;
        overflow: hidden;
      }
      #olympus-route-devtools.open {
        height: ${DEVTOOLS_PANEL_HEIGHT};
      }
      .ort-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: #1a1a2a;
        border-bottom: 1px solid #2a2a3a;
      }
      .ort-header h3 {
        margin: 0;
        font-size: 13px;
        font-weight: 600;
        color: #a78bfa;
      }
      .ort-header .ort-badge {
        background: #4c1d95;
        color: #c4b5fd;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 10px;
      }
      .ort-content {
        display: flex;
        height: calc(100% - 45px);
      }
      .ort-sidebar {
        width: ${DEVTOOLS_SIDEBAR_WIDTH};
        border-right: 1px solid #2a2a3a;
        overflow-y: auto;
      }
      .ort-main {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
      }
      .ort-route-item {
        padding: 8px 16px;
        cursor: pointer;
        border-bottom: 1px solid #1a1a2a;
        transition: background 0.15s;
      }
      .ort-route-item:hover {
        background: #1a1a2a;
      }
      .ort-route-item.active {
        background: #4c1d95;
      }
      .ort-route-key {
        color: #a78bfa;
        font-weight: 500;
      }
      .ort-route-path {
        color: #666;
        font-size: 11px;
        margin-top: 2px;
      }
      .ort-current {
        background: #1e1e2e;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 16px;
      }
      .ort-current-label {
        color: #666;
        font-size: 10px;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .ort-current-value {
        color: #4ade80;
        font-size: 14px;
      }
      .ort-breadcrumbs {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 12px;
      }
      .ort-breadcrumb {
        background: #2a2a3a;
        padding: 4px 8px;
        border-radius: 4px;
        color: #a78bfa;
      }
      .ort-breadcrumb.current {
        background: #4c1d95;
        color: #e0e0e0;
      }
      .ort-toggle {
        position: fixed;
        bottom: 16px;
        right: 16px;
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        z-index: ${DEVTOOLS_Z_INDEX + 1};
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .ort-toggle:hover,
      .ort-toggle:focus {
        transform: scale(1.05);
        box-shadow: 0 6px 24px rgba(102, 126, 234, 0.5);
        outline: 2px solid #a78bfa;
        outline-offset: 2px;
      }
      .ort-toggle svg {
        width: 24px;
        height: 24px;
        color: white;
      }
      #olympus-route-devtools.open + .ort-toggle {
        bottom: calc(${DEVTOOLS_PANEL_HEIGHT} + 16px);
      }
      /* RESPONSIVE - Mobile fixes */
      @media (max-width: 768px) {
        #olympus-route-devtools.open {
          height: ${DEVTOOLS_MOBILE_HEIGHT};
        }
        .ort-content {
          flex-direction: column;
        }
        .ort-sidebar {
          width: 100%;
          max-height: 40%;
          border-right: none;
          border-bottom: 1px solid #2a2a3a;
        }
        .ort-toggle {
          bottom: 80px; /* Above mobile nav */
          right: 12px;
          width: 40px;
          height: 40px;
        }
        #olympus-route-devtools.open + .ort-toggle {
          bottom: calc(50vh + 16px);
        }
      }
    </style>
    <div class="ort-header">
      <h3>OLYMPUS Route DevTools</h3>
      <span class="ort-badge">${COMPILED_ROUTES.length} routes</span>
    </div>
    <div class="ort-content">
      <div class="ort-sidebar" id="ort-route-list"></div>
      <div class="ort-main" id="ort-details"></div>
    </div>
  `;

  // Toggle button with full accessibility
  const toggle = document.createElement('button');
  toggle.className = 'ort-toggle';
  toggle.setAttribute('aria-label', 'Toggle Route DevTools');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'olympus-route-devtools');
  toggle.title = 'Route DevTools (Ctrl+Shift+R)';
  toggle.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
    </svg>
  `;

  document.body.appendChild(panel);
  document.body.appendChild(toggle);

  let isOpen = false;

  function togglePanel() {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) updatePanel();
  }

  function updatePanel() {
    const currentPath = window.location.pathname;
    const match = matchRoute(currentPath);
    const breadcrumbs = getBreadcrumbs(currentPath);

    // Route list (keys are safe, from ROUTE_TREE)
    const listEl = document.getElementById('ort-route-list');
    if (!listEl) return; // SSR guard
    listEl.innerHTML = COMPILED_ROUTES.map(
      r => `
      <div class="ort-route-item ${r.key === match?.key ? 'active' : ''}" data-key="${escapeHtml(r.key)}">
        <div class="ort-route-key">${escapeHtml(r.key)}</div>
        <div class="ort-route-path">${escapeHtml(r.path)}</div>
      </div>
    `
    ).join('');

    // Details - escape ALL dynamic content
    const detailsEl = document.getElementById('ort-details');
    if (!detailsEl) return; // SSR guard
    detailsEl.innerHTML = `
      <div class="ort-current">
        <div class="ort-current-label">Current Path</div>
        <div class="ort-current-value">${escapeHtml(currentPath)}</div>
      </div>
      <div class="ort-current">
        <div class="ort-current-label">Matched Route</div>
        <div class="ort-current-value">${escapeHtml(match?.key || 'No match')}</div>
      </div>
      ${
        match?.params && Object.keys(match.params).length > 0
          ? `
        <div class="ort-current">
          <div class="ort-current-label">Params</div>
          <div class="ort-current-value">${escapeHtml(JSON.stringify(match.params, null, 2))}</div>
        </div>
      `
          : ''
      }
      <div class="ort-current">
        <div class="ort-current-label">Breadcrumbs</div>
        <div class="ort-breadcrumbs">
          ${breadcrumbs
            .map(
              b => `
            <span class="ort-breadcrumb ${b.isLast ? 'current' : ''}">${escapeHtml(b.title)}</span>
          `
            )
            .join(' → ')}
        </div>
      </div>
    `;

    // Click to navigate
    listEl.querySelectorAll('.ort-route-item').forEach(item => {
      item.addEventListener('click', () => {
        const key = item.getAttribute('data-key') as RouteKey;
        const routeDef = ROUTE_TREE[key];
        if (!routeDef.path.includes(':')) {
          window.location.href = routeDef.path;
        }
      });
    });
  }

  // Toggle button
  toggle.addEventListener('click', togglePanel);

  // Keyboard shortcut
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      togglePanel();
    }
  });

  // Update on navigation
  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    if (isOpen) setTimeout(updatePanel, 50);
  };

  window.addEventListener('popstate', () => {
    if (isOpen) setTimeout(updatePanel, 50);
  });
}

// Auto-inject in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  if (document.readyState === 'complete') {
    injectDevTools();
  } else {
    window.addEventListener('load', injectDevTools);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { ROUTE_TREE as routeTree };
export type { NavigationEvent, CompiledRoute };

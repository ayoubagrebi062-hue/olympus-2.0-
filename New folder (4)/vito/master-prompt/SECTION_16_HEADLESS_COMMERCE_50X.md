# SECTION 16: THE HEADLESS COMMERCE SYSTEM - 50X EDITION
## The Complete Enterprise Headless Architecture & Hydrogen Framework Mastery Guide

> **50X Enhancement**: Expanded from ~100 lines to 3500+ lines of production-grade headless commerce patterns, Hydrogen framework mastery, Storefront API integration, multi-vendor architectures, and enterprise e-commerce solutions for the OLYMPUS stack.

---

## TABLE OF CONTENTS

1. [Part 1: Headless Commerce Fundamentals](#part-1-headless-commerce-fundamentals)
2. [Part 2: Hydrogen Framework Deep Dive](#part-2-hydrogen-framework-deep-dive)
3. [Part 3: Storefront API Mastery](#part-3-storefront-api-mastery)
4. [Part 4: Cart & Checkout Architecture](#part-4-cart--checkout-architecture)
5. [Part 5: Customer Authentication & Accounts](#part-5-customer-authentication--accounts)
6. [Part 6: Product Catalog Management](#part-6-product-catalog-management)
7. [Part 7: Search, Filtering & Collections](#part-7-search-filtering--collections)
8. [Part 8: Internationalization & Multi-Currency](#part-8-internationalization--multi-currency)
9. [Part 9: Performance Optimization](#part-9-performance-optimization)
10. [Part 10: Deployment & Oxygen Edge Network](#part-10-deployment--oxygen-edge-network)
11. [Part 11: Alternative Headless Solutions](#part-11-alternative-headless-solutions)
12. [Part 12: Enterprise Patterns & Scaling](#part-12-enterprise-patterns--scaling)

---

## PART 1: HEADLESS COMMERCE FUNDAMENTALS

### 1.1 What is Headless Commerce?

Headless commerce decouples the frontend presentation layer from the backend commerce engine, allowing complete freedom in how products are displayed and purchased.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TRADITIONAL VS HEADLESS ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TRADITIONAL MONOLITH:                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        E-Commerce Platform                           │   │
│  │  ┌─────────────┬─────────────┬─────────────┬─────────────┐         │   │
│  │  │  Frontend   │   Backend   │  Database   │   Admin     │         │   │
│  │  │  (Themes)   │   (Logic)   │   (Data)    │  (CMS)      │         │   │
│  │  └─────────────┴─────────────┴─────────────┴─────────────┘         │   │
│  │                     Tightly Coupled                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  HEADLESS ARCHITECTURE:                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  FRONTEND LAYER (Choose Any Technology)                              │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐       │   │
│  │  │ React  │  │  Vue   │  │ Mobile │  │  IoT   │  │  PWA   │       │   │
│  │  │Hydrogen│  │Nuxt.js │  │  App   │  │ Device │  │        │       │   │
│  │  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘       │   │
│  │      │           │           │           │           │             │   │
│  └──────┼───────────┼───────────┼───────────┼───────────┼─────────────┘   │
│         │           │           │           │           │                  │
│  ┌──────▼───────────▼───────────▼───────────▼───────────▼─────────────┐   │
│  │                         API LAYER                                    │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │     GraphQL / REST API (Storefront API, Admin API)         │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────▼──────────────────────────────────┐   │
│  │                    COMMERCE ENGINE (Backend)                        │   │
│  │  ┌─────────────┬─────────────┬─────────────┬─────────────┐        │   │
│  │  │  Products   │   Orders    │  Inventory  │  Customers  │        │   │
│  │  │  Catalog    │  Management │  Tracking   │  Accounts   │        │   │
│  │  └─────────────┴─────────────┴─────────────┴─────────────┘        │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Benefits of Headless Commerce

```typescript
// headless-commerce/benefits-analysis.ts
// Comprehensive analysis of headless commerce advantages

interface HeadlessBenefit {
  category: string;
  benefit: string;
  impact: 'high' | 'medium' | 'low';
  implementation: string;
  metrics: string[];
}

const headlessBenefits: HeadlessBenefit[] = [
  // Performance Benefits
  {
    category: 'Performance',
    benefit: 'Faster Page Loads',
    impact: 'high',
    implementation: 'Static generation, edge caching, CDN distribution',
    metrics: [
      'LCP < 2.5s (vs 4-6s traditional)',
      'FID < 100ms',
      'CLS < 0.1',
      '40-60% faster than monolith'
    ]
  },
  {
    category: 'Performance',
    benefit: 'Edge Computing',
    impact: 'high',
    implementation: 'Deploy to global edge network (Oxygen, Vercel Edge)',
    metrics: [
      'TTFB < 50ms globally',
      '99.99% uptime',
      'Auto-scaling during traffic spikes'
    ]
  },

  // Developer Experience
  {
    category: 'Developer Experience',
    benefit: 'Technology Freedom',
    impact: 'high',
    implementation: 'Use any frontend framework: React, Vue, Svelte, etc.',
    metrics: [
      '50% faster development time',
      'Use familiar tools and libraries',
      'Larger talent pool'
    ]
  },
  {
    category: 'Developer Experience',
    benefit: 'Independent Deployments',
    impact: 'high',
    implementation: 'Deploy frontend without touching backend',
    metrics: [
      '10x more frequent deployments',
      'Zero-downtime updates',
      'Instant rollbacks'
    ]
  },

  // Business Benefits
  {
    category: 'Business',
    benefit: 'Omnichannel Ready',
    impact: 'high',
    implementation: 'Single API serves web, mobile, IoT, kiosks',
    metrics: [
      'One codebase for all channels',
      '30% reduction in development costs',
      'Consistent experience everywhere'
    ]
  },
  {
    category: 'Business',
    benefit: 'Composable Commerce',
    impact: 'medium',
    implementation: 'Best-of-breed integrations (payments, search, CMS)',
    metrics: [
      'Swap vendors without rebuilding',
      'Add new capabilities quickly',
      'Future-proof architecture'
    ]
  },

  // SEO Benefits
  {
    category: 'SEO',
    benefit: 'Server-Side Rendering',
    impact: 'high',
    implementation: 'Full SSR with Remix/Next.js',
    metrics: [
      '100% content indexable',
      'Faster crawling',
      'Better Core Web Vitals'
    ]
  }
];

// Decision Framework
interface HeadlessDecision {
  useCase: string;
  recommended: boolean;
  reasoning: string;
  alternatives?: string[];
}

const headlessDecisionFramework: HeadlessDecision[] = [
  {
    useCase: 'High-traffic storefront (>100k monthly visitors)',
    recommended: true,
    reasoning: 'Performance benefits justify complexity'
  },
  {
    useCase: 'Multi-channel presence (web + mobile + POS)',
    recommended: true,
    reasoning: 'Single API serves all channels efficiently'
  },
  {
    useCase: 'Custom brand experience',
    recommended: true,
    reasoning: 'Full design freedom without theme limitations'
  },
  {
    useCase: 'Small catalog (<100 products), low traffic',
    recommended: false,
    reasoning: 'Hosted themes are faster to launch',
    alternatives: ['Shopify Themes', 'BigCommerce Stencil']
  },
  {
    useCase: 'No dedicated development team',
    recommended: false,
    reasoning: 'Requires ongoing technical maintenance',
    alternatives: ['Shopify with Apps', 'WooCommerce']
  },
  {
    useCase: 'Rapid MVP launch (<1 month)',
    recommended: false,
    reasoning: 'Theme-based approach is faster',
    alternatives: ['Dawn theme customization', 'Shogun']
  }
];

export { headlessBenefits, headlessDecisionFramework };
```

### 1.3 Headless Commerce Architecture Patterns

```typescript
// headless-commerce/architecture-patterns.ts
// Common architectural patterns for headless commerce

/**
 * Pattern 1: Commerce-Led Headless
 * Shopify/BigCommerce as commerce engine, custom frontend
 */
interface CommerceLedArchitecture {
  commerceEngine: 'shopify' | 'bigcommerce' | 'commercetools';
  frontend: 'hydrogen' | 'nextjs' | 'nuxt' | 'gatsby';
  cms: 'sanity' | 'contentful' | 'strapi';
  search: 'algolia' | 'typesense' | 'native';
}

const commerceLedExample: CommerceLedArchitecture = {
  commerceEngine: 'shopify',
  frontend: 'hydrogen',
  cms: 'sanity',
  search: 'algolia'
};

/**
 * Pattern 2: CMS-Led Commerce
 * Headless CMS as primary, commerce as integration
 */
interface CMSLedArchitecture {
  cms: 'sanity' | 'contentful' | 'strapi';
  commerce: 'shopify-buy-sdk' | 'snipcart' | 'stripe';
  frontend: 'nextjs' | 'gatsby' | 'astro';
}

/**
 * Pattern 3: Composable Commerce (MACH Architecture)
 * Microservices, API-first, Cloud-native, Headless
 */
interface MACHArchitecture {
  microservices: {
    catalog: string;
    cart: string;
    checkout: string;
    customers: string;
    inventory: string;
    search: string;
    content: string;
  };
  orchestration: 'api-gateway' | 'graphql-federation' | 'event-driven';
  deployment: 'kubernetes' | 'serverless' | 'edge';
}

const machExample: MACHArchitecture = {
  microservices: {
    catalog: 'commercetools',
    cart: 'custom-service',
    checkout: 'shopify',
    customers: 'auth0',
    inventory: 'custom-service',
    search: 'algolia',
    content: 'sanity'
  },
  orchestration: 'graphql-federation',
  deployment: 'edge'
};

/**
 * Pattern 4: Hybrid Architecture
 * Theme for some pages, headless for others
 */
interface HybridArchitecture {
  themedPages: string[];  // Use Shopify theme
  headlessPages: string[]; // Custom React/Hydrogen
  dataFlow: 'proxy' | 'api-direct';
}

const hybridExample: HybridArchitecture = {
  themedPages: ['/cart', '/checkout', '/account'],
  headlessPages: ['/', '/products/*', '/collections/*'],
  dataFlow: 'api-direct'
};
```

### 1.4 Technology Stack Comparison

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HEADLESS COMMERCE STACK COMPARISON                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  FRAMEWORK          │ PLATFORM    │ BEST FOR              │ LEARNING CURVE │
│  ───────────────────┼─────────────┼───────────────────────┼────────────────│
│  Hydrogen           │ Shopify     │ Shopify merchants     │ Medium         │
│  Next.js Commerce   │ Multi       │ Multi-vendor          │ Medium         │
│  Medusa.js          │ Self-hosted │ Open-source needs     │ High           │
│  Saleor             │ Self-hosted │ Enterprise open-src   │ High           │
│  Vue Storefront     │ Multi       │ Vue.js teams          │ Medium         │
│  Gatsby + Shopify   │ Shopify     │ Static-first sites    │ Low-Medium     │
│                                                                              │
│  COMMERCE ENGINE    │ API TYPE    │ PRICING               │ SCALABILITY    │
│  ───────────────────┼─────────────┼───────────────────────┼────────────────│
│  Shopify Plus       │ GraphQL     │ $2,000+/month         │ Enterprise     │
│  BigCommerce        │ REST/GQL    │ $299+/month           │ High           │
│  commercetools      │ GraphQL     │ Custom pricing        │ Enterprise     │
│  Elastic Path       │ REST        │ Custom pricing        │ Enterprise     │
│  Medusa             │ REST        │ Free (self-hosted)    │ High           │
│                                                                              │
│  RECOMMENDED OLYMPUS STACK:                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Frontend:   Hydrogen (React + Remix)                                │   │
│  │  Commerce:   Shopify Storefront API                                  │   │
│  │  CMS:        Sanity (for custom content)                             │   │
│  │  Search:     Algolia (for advanced search)                           │   │
│  │  Auth:       Shopify Customer Accounts API                           │   │
│  │  Payments:   Shopify Checkout                                        │   │
│  │  Deploy:     Oxygen (Shopify's edge) or Vercel                       │   │
│  │  Database:   Supabase (for custom data/analytics)                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PART 2: HYDROGEN FRAMEWORK DEEP DIVE

### 2.1 Understanding Hydrogen

Hydrogen is Shopify's official React framework for building custom storefronts. Built on Remix, it provides first-class integration with Shopify's Storefront API.

```typescript
// hydrogen-overview.ts
// Core concepts and architecture

/**
 * Hydrogen Core Components
 */
interface HydrogenArchitecture {
  // Foundation
  framework: 'Remix'; // Full-stack web framework
  runtime: '@shopify/remix-oxygen'; // Edge runtime

  // Shopify Integration
  storefront: '@shopify/hydrogen'; // Storefront components
  storefrontApi: 'GraphQL'; // Data fetching
  customerApi: 'GraphQL'; // Account management

  // Features
  features: [
    'Server Components',
    'Streaming SSR',
    'Edge Caching',
    'Cart Management',
    'Customer Accounts',
    'Internationalization',
    'Analytics Integration'
  ];

  // Deployment
  deployment: 'Oxygen' | 'Vercel' | 'Netlify' | 'Cloudflare';
}
```

### 2.2 Project Setup & Configuration

```bash
# Create new Hydrogen project
npm create @shopify/hydrogen@latest

# Interactive prompts:
# - Project name: my-hydrogen-store
# - Template: Demo Store (recommended for learning)
# - Language: TypeScript
# - Styling: Tailwind CSS
# - Install dependencies: Yes

# Navigate to project
cd my-hydrogen-store

# Start development server
shopify hydrogen dev

# Development server runs at http://localhost:3000
```

### 2.3 Project Structure Deep Dive

```
hydrogen-store/
├── .shopify/                      # Shopify CLI configuration
│   └── project.json               # Project metadata
├── app/
│   ├── components/                # React components
│   │   ├── AddToCartButton.tsx    # Cart interaction
│   │   ├── Cart.tsx               # Cart drawer/page
│   │   ├── Footer.tsx             # Site footer
│   │   ├── Header.tsx             # Site header
│   │   ├── Layout.tsx             # Page layout wrapper
│   │   ├── ProductCard.tsx        # Product display
│   │   ├── ProductForm.tsx        # Variant selection
│   │   └── SearchForm.tsx         # Search functionality
│   │
│   ├── routes/                    # Remix routes (file-based)
│   │   ├── _index.tsx             # Home page (/)
│   │   ├── products.$handle.tsx   # Product page (/products/[handle])
│   │   ├── collections._index.tsx # Collections list (/collections)
│   │   ├── collections.$handle.tsx # Collection page
│   │   ├── cart.tsx               # Cart page (/cart)
│   │   ├── account.tsx            # Account hub (/account)
│   │   ├── account.login.tsx      # Login page
│   │   ├── account.register.tsx   # Registration page
│   │   ├── account.orders.tsx     # Order history
│   │   ├── search.tsx             # Search results (/search)
│   │   ├── pages.$handle.tsx      # CMS pages
│   │   └── [sitemap.xml].tsx      # Dynamic sitemap
│   │
│   ├── lib/                       # Utility functions
│   │   ├── context.ts             # React contexts
│   │   ├── fragments.ts           # GraphQL fragments
│   │   ├── utils.ts               # Helper functions
│   │   └── validation.ts          # Form validation
│   │
│   ├── styles/                    # CSS/Tailwind
│   │   ├── app.css                # Global styles
│   │   ├── tailwind.css           # Tailwind imports
│   │   └── components/            # Component styles
│   │
│   ├── entry.client.tsx           # Client entry point
│   ├── entry.server.tsx           # Server entry point
│   └── root.tsx                   # Root layout
│
├── public/                        # Static assets
│   ├── favicon.ico
│   └── robots.txt
│
├── shopify.hydrogen.toml          # Hydrogen config
├── remix.config.js                # Remix configuration
├── tailwind.config.js             # Tailwind configuration
├── tsconfig.json                  # TypeScript config
├── .env                           # Environment variables
└── package.json                   # Dependencies
```

### 2.4 Configuration Files

```toml
# shopify.hydrogen.toml
# Hydrogen project configuration

[shopify]
# Store connection
storeId = "your-store-id"
storefrontApiVersion = "2024-01"

[environments.production]
# Production settings
env = { show = ["PUBLIC_STOREFRONT_API_TOKEN"] }

[environments.staging]
# Staging environment
env = { show = ["PUBLIC_STOREFRONT_API_TOKEN"] }
```

```typescript
// remix.config.js
// Remix framework configuration

/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  appDirectory: 'app',
  ignoredRouteFiles: ['**/.*'],
  watchPaths: ['./public'],
  server: './server.ts',

  // Hydrogen-specific
  serverModuleFormat: 'esm',
  serverPlatform: 'neutral',
  serverMinify: true,

  // Route conventions
  routes: async (defineRoutes) => {
    return defineRoutes((route) => {
      // Custom route definitions if needed
    });
  },

  future: {
    v2_errorBoundary: true,
    v2_headers: true,
    v2_meta: true,
    v2_normalizeFormMethod: true,
    v2_routeConvention: true,
  },
};
```

```typescript
// app/entry.server.tsx
// Server-side entry point

import { createRequestHandler } from '@shopify/remix-oxygen';
import { createStorefrontClient } from '@shopify/hydrogen';

export default {
  async fetch(
    request: Request,
    env: Env,
    executionContext: ExecutionContext
  ): Promise<Response> {
    // Create Storefront client
    const { storefront } = createStorefrontClient({
      publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
      storeDomain: env.PUBLIC_STORE_DOMAIN,
      storefrontApiVersion: '2024-01',
      storefrontId: env.PUBLIC_STOREFRONT_ID,
    });

    // Create request handler
    const handleRequest = createRequestHandler({
      build: await import('./build/server'),
      mode: process.env.NODE_ENV,
      getLoadContext: () => ({
        env,
        storefront,
        waitUntil: executionContext.waitUntil.bind(executionContext),
      }),
    });

    return handleRequest(request);
  },
};
```

### 2.5 Environment Variables

```bash
# .env
# Development environment variables

# Shopify Store Configuration
PUBLIC_STORE_DOMAIN=your-store.myshopify.com
PUBLIC_STOREFRONT_API_TOKEN=your-public-token
PRIVATE_STOREFRONT_API_TOKEN=your-private-token

# Storefront ID (for analytics)
PUBLIC_STOREFRONT_ID=your-storefront-id

# Session Secret (for customer accounts)
SESSION_SECRET=your-session-secret

# Optional: Custom domains
# PUBLIC_CHECKOUT_DOMAIN=checkout.your-domain.com

# Third-party integrations
# SANITY_PROJECT_ID=your-sanity-project
# ALGOLIA_APP_ID=your-algolia-app
# ALGOLIA_SEARCH_KEY=your-algolia-key
```

### 2.6 Root Layout Configuration

```tsx
// app/root.tsx
// Root application layout

import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from '@remix-run/react';
import {
  Analytics,
  useNonce,
  getSeoMeta,
} from '@shopify/hydrogen';
import type { LoaderFunctionArgs, MetaFunction } from '@shopify/remix-oxygen';
import { Layout } from '~/components/Layout';
import styles from '~/styles/app.css';
import favicon from '~/assets/favicon.svg';

export const links = () => [
  { rel: 'stylesheet', href: styles },
  { rel: 'icon', type: 'image/svg+xml', href: favicon },
  { rel: 'preconnect', href: 'https://cdn.shopify.com' },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
];

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return getSeoMeta(data?.seo);
};

export async function loader({ context }: LoaderFunctionArgs) {
  const { storefront, customerAccount } = context;

  // Fetch header/footer data
  const [header, footer] = await Promise.all([
    storefront.query(HEADER_QUERY),
    storefront.query(FOOTER_QUERY),
  ]);

  // Check if customer is logged in
  const isLoggedIn = await customerAccount.isLoggedIn();

  return {
    header,
    footer,
    isLoggedIn,
    publicStoreDomain: context.env.PUBLIC_STORE_DOMAIN,
    seo: {
      title: 'OLYMPUS Store',
      description: 'Premium products for the modern lifestyle',
    },
  };
}

export default function App() {
  const nonce = useNonce();
  const data = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Analytics.Provider
          cart={data.cart}
          shop={data.shop}
          consent={data.consent}
        >
          <Layout
            header={data.header}
            footer={data.footer}
            isLoggedIn={data.isLoggedIn}
          >
            <Outlet />
          </Layout>
        </Analytics.Provider>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

// Error boundary
export function ErrorBoundary() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <div className="error-container">
          <h1>Something went wrong</h1>
          <p>Please try refreshing the page.</p>
        </div>
        <Scripts />
      </body>
    </html>
  );
}

const HEADER_QUERY = `#graphql
  query Header {
    shop {
      name
      brand {
        logo {
          image {
            url
          }
        }
      }
    }
    menu(handle: "main-menu") {
      items {
        title
        url
      }
    }
  }
`;

const FOOTER_QUERY = `#graphql
  query Footer {
    menu(handle: "footer") {
      items {
        title
        url
      }
    }
  }
`;
```

---

## PART 3: STOREFRONT API MASTERY

### 3.1 Understanding the Storefront API

```typescript
// storefront-api/overview.ts
// Comprehensive Storefront API guide

/**
 * Storefront API Characteristics:
 * - GraphQL-only (no REST)
 * - Public-facing (uses public token)
 * - Read-heavy (limited mutations)
 * - Rate limited (based on calculated cost)
 */

interface StorefrontAPIConfig {
  // API Versions (update quarterly)
  version: '2024-01' | '2024-04' | '2024-07' | '2024-10';

  // Rate Limits
  rateLimits: {
    publicToken: {
      bucketSize: 60; // Maximum points
      leakRate: 30;   // Points restored per second
    };
    privateToken: {
      bucketSize: 120;
      leakRate: 60;
    };
  };

  // Query cost calculation
  costFactors: {
    rootField: 1;
    connection: 2;
    connectionPage: number; // based on 'first'/'last'
  };
}

// Available Query Types
type StorefrontQueryTypes = {
  // Products
  product: 'Single product by handle/ID';
  products: 'Product listing with filters';
  productRecommendations: 'Related products';

  // Collections
  collection: 'Single collection';
  collections: 'Collection listing';

  // Cart
  cart: 'Cart by ID';

  // Customer (requires customer access token)
  customer: 'Authenticated customer data';

  // Shop
  shop: 'Store information';
  localization: 'Available countries/currencies';

  // Search
  search: 'Product/page/article search';
  predictiveSearch: 'Autocomplete suggestions';

  // Content
  page: 'CMS page';
  blog: 'Blog with articles';
  article: 'Single article';

  // Metaobjects
  metaobject: 'Custom content type';
  metaobjects: 'List metaobjects';
};

// Available Mutation Types
type StorefrontMutationTypes = {
  // Cart
  cartCreate: 'Create new cart';
  cartLinesAdd: 'Add items to cart';
  cartLinesUpdate: 'Update cart items';
  cartLinesRemove: 'Remove from cart';
  cartDiscountCodesUpdate: 'Apply/remove discounts';
  cartBuyerIdentityUpdate: 'Update customer info';
  cartNoteUpdate: 'Update cart note';
  cartSelectedDeliveryOptionsUpdate: 'Set delivery';

  // Customer (requires customer access token)
  customerCreate: 'Register new customer';
  customerAccessTokenCreate: 'Login';
  customerAccessTokenRenew: 'Refresh token';
  customerAccessTokenDelete: 'Logout';
  customerUpdate: 'Update profile';
  customerAddressCreate: 'Add address';
  customerAddressUpdate: 'Update address';
  customerAddressDelete: 'Remove address';
  customerDefaultAddressUpdate: 'Set default address';
  customerRecover: 'Password reset email';
  customerReset: 'Reset password';
};
```

### 3.2 GraphQL Query Patterns

```typescript
// storefront-api/queries.ts
// Production-ready GraphQL queries

// Product Query with Full Details
export const PRODUCT_QUERY = `#graphql
  query Product(
    $handle: String!
    $selectedOptions: [SelectedOptionInput!]!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
      handle
      descriptionHtml
      vendor
      productType
      tags
      publishedAt

      # SEO
      seo {
        title
        description
      }

      # Media
      featuredImage {
        url
        altText
        width
        height
      }

      media(first: 10) {
        nodes {
          ... on MediaImage {
            id
            image {
              url(transform: { maxWidth: 1200, maxHeight: 1200 })
              altText
              width
              height
            }
          }
          ... on Video {
            id
            sources {
              url
              mimeType
            }
          }
          ... on Model3d {
            id
            sources {
              url
              mimeType
            }
          }
        }
      }

      # Pricing
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
        maxVariantPrice {
          amount
          currencyCode
        }
      }

      compareAtPriceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }

      # Options
      options {
        name
        values
      }

      # Selected Variant (for variant-specific pages)
      selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {
        ...ProductVariantFragment
      }

      # All Variants
      variants(first: 100) {
        nodes {
          ...ProductVariantFragment
        }
      }

      # Metafields (custom data)
      specifications: metafield(namespace: "custom", key: "specifications") {
        value
        type
      }

      materials: metafield(namespace: "custom", key: "materials") {
        value
        type
      }

      # Reviews integration
      reviewsAverage: metafield(namespace: "reviews", key: "average") {
        value
      }

      reviewsCount: metafield(namespace: "reviews", key: "count") {
        value
      }
    }
  }

  fragment ProductVariantFragment on ProductVariant {
    id
    title
    availableForSale
    quantityAvailable

    selectedOptions {
      name
      value
    }

    price {
      amount
      currencyCode
    }

    compareAtPrice {
      amount
      currencyCode
    }

    image {
      url(transform: { maxWidth: 800, maxHeight: 800 })
      altText
      width
      height
    }

    sku
    barcode

    # Variant metafields
    weight: metafield(namespace: "custom", key: "weight") {
      value
    }
  }
`;

// Collection Query with Filtering
export const COLLECTION_QUERY = `#graphql
  query Collection(
    $handle: String!
    $first: Int!
    $after: String
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      title
      handle
      description
      descriptionHtml

      seo {
        title
        description
      }

      image {
        url(transform: { maxWidth: 1920 })
        altText
        width
        height
      }

      # Products with pagination and filters
      products(
        first: $first
        after: $after
        filters: $filters
        sortKey: $sortKey
        reverse: $reverse
      ) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }

        # Available filters
        filters {
          id
          label
          type
          values {
            id
            label
            count
            input
          }
        }

        nodes {
          ...ProductCardFragment
        }
      }
    }
  }

  fragment ProductCardFragment on Product {
    id
    title
    handle
    vendor
    publishedAt
    availableForSale

    featuredImage {
      url(transform: { maxWidth: 600, maxHeight: 600 })
      altText
      width
      height
    }

    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }

    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }

    variants(first: 1) {
      nodes {
        id
        availableForSale
      }
    }

    # Quick add - first available variant
    firstAvailableVariant: variants(first: 1) {
      nodes {
        id
        availableForSale
        selectedOptions {
          name
          value
        }
      }
    }
  }
`;

// Search Query
export const SEARCH_QUERY = `#graphql
  query Search(
    $query: String!
    $first: Int!
    $after: String
    $productFilters: [ProductFilter!]
    $sortKey: SearchSortKeys
    $reverse: Boolean
    $types: [SearchType!]
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    search(
      query: $query
      first: $first
      after: $after
      productFilters: $productFilters
      sortKey: $sortKey
      reverse: $reverse
      types: $types
    ) {
      totalCount

      pageInfo {
        hasNextPage
        endCursor
      }

      productFilters {
        id
        label
        type
        values {
          id
          label
          count
          input
        }
      }

      nodes {
        ... on Product {
          __typename
          ...ProductCardFragment
        }
        ... on Page {
          __typename
          id
          title
          handle
        }
        ... on Article {
          __typename
          id
          title
          handle
          blog {
            handle
          }
        }
      }
    }
  }
`;

// Predictive Search (for autocomplete)
export const PREDICTIVE_SEARCH_QUERY = `#graphql
  query PredictiveSearch(
    $query: String!
    $limit: Int!
    $limitScope: PredictiveSearchLimitScope!
    $types: [PredictiveSearchType!]
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    predictiveSearch(
      query: $query
      limit: $limit
      limitScope: $limitScope
      types: $types
    ) {
      products {
        id
        title
        handle
        featuredImage {
          url(transform: { maxWidth: 100, maxHeight: 100 })
          altText
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }

      collections {
        id
        title
        handle
        image {
          url(transform: { maxWidth: 100, maxHeight: 100 })
          altText
        }
      }

      pages {
        id
        title
        handle
      }

      articles {
        id
        title
        handle
        blog {
          handle
        }
      }

      queries {
        text
        styledText
      }
    }
  }
`;
```

### 3.3 Custom Storefront Client

```typescript
// lib/storefront.ts
// Enhanced Storefront client with caching and error handling

import {
  createStorefrontClient,
  type StorefrontClient,
  type I18nBase,
} from '@shopify/hydrogen';

// Types for our custom client
interface StorefrontConfig {
  storeDomain: string;
  publicToken: string;
  privateToken?: string;
  apiVersion: string;
}

interface QueryOptions {
  cache?: RequestCache;
  revalidate?: number;
  variables?: Record<string, unknown>;
}

interface StorefrontError {
  message: string;
  extensions?: {
    code: string;
    cost?: {
      requestedQueryCost: number;
      actualQueryCost: number;
      throttleStatus: {
        maximumAvailable: number;
        currentlyAvailable: number;
        restoreRate: number;
      };
    };
  };
}

// Create enhanced storefront client
export function createEnhancedStorefront(config: StorefrontConfig) {
  const { storefront } = createStorefrontClient({
    storeDomain: config.storeDomain,
    publicStorefrontToken: config.publicToken,
    privateStorefrontToken: config.privateToken,
    storefrontApiVersion: config.apiVersion,
  });

  return {
    // Query with enhanced error handling
    async query<T = unknown>(
      query: string,
      options: QueryOptions = {}
    ): Promise<T> {
      try {
        const response = await storefront.query<T>(query, {
          variables: options.variables,
          cache: options.cache ?? 'force-cache',
        });

        return response;
      } catch (error) {
        handleStorefrontError(error as StorefrontError);
        throw error;
      }
    },

    // Mutation with error handling
    async mutate<T = unknown>(
      mutation: string,
      variables: Record<string, unknown>
    ): Promise<T> {
      try {
        const response = await storefront.mutate<T>(mutation, {
          variables,
        });

        return response;
      } catch (error) {
        handleStorefrontError(error as StorefrontError);
        throw error;
      }
    },

    // Batch multiple queries
    async batch<T extends Record<string, unknown>>(
      queries: Array<{ query: string; variables?: Record<string, unknown> }>
    ): Promise<T[]> {
      return Promise.all(
        queries.map((q) =>
          this.query<T>(q.query, { variables: q.variables })
        )
      );
    },
  };
}

// Error handler
function handleStorefrontError(error: StorefrontError): void {
  // Rate limiting
  if (error.extensions?.code === 'THROTTLED') {
    const { throttleStatus } = error.extensions.cost!;
    console.error(
      `Rate limited! Available: ${throttleStatus.currentlyAvailable}/${throttleStatus.maximumAvailable}`
    );
  }

  // Query cost exceeded
  if (error.extensions?.cost) {
    const { requestedQueryCost, actualQueryCost } = error.extensions.cost;
    console.warn(
      `Query cost: ${actualQueryCost} (requested: ${requestedQueryCost})`
    );
  }

  // Log all errors
  console.error('Storefront API Error:', error.message);
}

// Cache strategies
export const cacheStrategies = {
  // No caching - always fresh
  noStore: { cache: 'no-store' as const },

  // Cache until revalidated
  forceCache: { cache: 'force-cache' as const },

  // Revalidate every N seconds
  revalidate: (seconds: number) => ({
    next: { revalidate: seconds },
  }),

  // Long-lived cache (1 hour)
  longCache: { next: { revalidate: 3600 } },

  // Short cache (1 minute)
  shortCache: { next: { revalidate: 60 } },
};

// Usage in routes
export async function loadProduct(
  storefront: ReturnType<typeof createEnhancedStorefront>,
  handle: string,
  options?: QueryOptions
) {
  return storefront.query(PRODUCT_QUERY, {
    variables: { handle },
    ...cacheStrategies.shortCache,
    ...options,
  });
}
```

### 3.4 Data Fetching Patterns in Routes

```tsx
// app/routes/products.$handle.tsx
// Production-ready product page

import { json, redirect, type LoaderFunctionArgs } from '@shopify/remix-oxygen';
import { useLoaderData, type MetaFunction } from '@remix-run/react';
import { getSelectedProductOptions, Analytics, getSeoMeta } from '@shopify/hydrogen';
import { ProductDetails } from '~/components/ProductDetails';
import { ProductRecommendations } from '~/components/ProductRecommendations';
import { PRODUCT_QUERY, RECOMMENDATIONS_QUERY } from '~/lib/queries';

// SEO Meta
export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.product) {
    return [{ title: 'Product Not Found' }];
  }

  return getSeoMeta({
    title: data.product.seo?.title || data.product.title,
    description: data.product.seo?.description || data.product.description,
    url: data.url,
    media: data.product.featuredImage
      ? [
          {
            url: data.product.featuredImage.url,
            type: 'image',
            width: data.product.featuredImage.width,
            height: data.product.featuredImage.height,
            altText: data.product.featuredImage.altText,
          },
        ]
      : undefined,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: data.product.title,
      description: data.product.description,
      image: data.product.featuredImage?.url,
      offers: {
        '@type': 'Offer',
        price: data.product.priceRange.minVariantPrice.amount,
        priceCurrency: data.product.priceRange.minVariantPrice.currencyCode,
        availability: data.product.availableForSale
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      },
    },
  });
};

// Loader
export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const { handle } = params;
  const { storefront } = context;

  if (!handle) {
    throw new Response('Product handle required', { status: 400 });
  }

  // Get selected options from URL
  const selectedOptions = getSelectedProductOptions(request);

  // Fetch product and recommendations in parallel
  const [{ product }, { productRecommendations }] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {
        handle,
        selectedOptions,
        country: context.storefront.i18n.country,
        language: context.storefront.i18n.language,
      },
    }),
    storefront.query(RECOMMENDATIONS_QUERY, {
      variables: { productId: `gid://shopify/Product/${handle}` },
    }).catch(() => ({ productRecommendations: [] })),
  ]);

  // 404 if product not found
  if (!product) {
    throw new Response('Product not found', { status: 404 });
  }

  // Redirect to variant URL if selected options don't match
  const selectedVariant = product.selectedVariant ?? product.variants.nodes[0];

  if (selectedVariant && !selectedVariant.selectedOptions.every(
    (option: { name: string; value: string }) =>
      selectedOptions.find((so) => so.name === option.name && so.value === option.value)
  )) {
    const variantUrl = getVariantUrl(product.handle, selectedVariant.selectedOptions);
    return redirect(variantUrl, { status: 302 });
  }

  return json({
    product,
    selectedVariant,
    recommendations: productRecommendations,
    url: request.url,
  });
}

// Component
export default function ProductPage() {
  const { product, selectedVariant, recommendations } = useLoaderData<typeof loader>();

  return (
    <div className="product-page">
      {/* Analytics tracking */}
      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />

      {/* Product details */}
      <ProductDetails product={product} selectedVariant={selectedVariant} />

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <ProductRecommendations products={recommendations} />
      )}
    </div>
  );
}

// Helper function
function getVariantUrl(
  productHandle: string,
  selectedOptions: Array<{ name: string; value: string }>
): string {
  const params = new URLSearchParams();
  selectedOptions.forEach((option) => {
    params.set(option.name, option.value);
  });
  return `/products/${productHandle}?${params.toString()}`;
}
```

---

## PART 4: CART & CHECKOUT ARCHITECTURE

### 4.1 Cart State Management

```tsx
// components/CartProvider.tsx
// Global cart context and state management

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useFetcher } from '@remix-run/react';
import type { Cart, CartLine } from '@shopify/hydrogen/storefront-api-types';

interface CartContextValue {
  cart: Cart | null;
  cartCount: number;
  cartTotal: string;
  isOpen: boolean;
  isLoading: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (variantId: string, quantity?: number) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  removeFromCart: (lineId: string) => void;
  applyDiscount: (code: string) => void;
  removeDiscount: (code: string) => void;
  updateNote: (note: string) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
  cart: initialCart,
}: {
  children: ReactNode;
  cart: Cart | null;
}) {
  const [cart, setCart] = useState<Cart | null>(initialCart);
  const [isOpen, setIsOpen] = useState(false);
  const fetcher = useFetcher();

  const isLoading = fetcher.state !== 'idle';

  // Calculate cart count
  const cartCount = cart?.totalQuantity ?? 0;

  // Calculate cart total
  const cartTotal = cart?.cost?.totalAmount
    ? formatMoney(cart.cost.totalAmount)
    : '$0.00';

  // Open/close cart drawer
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  // Add to cart
  const addToCart = useCallback(
    (variantId: string, quantity = 1) => {
      fetcher.submit(
        {
          action: 'ADD_TO_CART',
          variantId,
          quantity: String(quantity),
        },
        { method: 'POST', action: '/cart' }
      );
      openCart();
    },
    [fetcher, openCart]
  );

  // Update quantity
  const updateQuantity = useCallback(
    (lineId: string, quantity: number) => {
      fetcher.submit(
        {
          action: 'UPDATE_QUANTITY',
          lineId,
          quantity: String(quantity),
        },
        { method: 'POST', action: '/cart' }
      );
    },
    [fetcher]
  );

  // Remove from cart
  const removeFromCart = useCallback(
    (lineId: string) => {
      fetcher.submit(
        {
          action: 'REMOVE_FROM_CART',
          lineId,
        },
        { method: 'POST', action: '/cart' }
      );
    },
    [fetcher]
  );

  // Apply discount code
  const applyDiscount = useCallback(
    (code: string) => {
      fetcher.submit(
        {
          action: 'APPLY_DISCOUNT',
          discountCode: code,
        },
        { method: 'POST', action: '/cart' }
      );
    },
    [fetcher]
  );

  // Remove discount code
  const removeDiscount = useCallback(
    (code: string) => {
      fetcher.submit(
        {
          action: 'REMOVE_DISCOUNT',
          discountCode: code,
        },
        { method: 'POST', action: '/cart' }
      );
    },
    [fetcher]
  );

  // Update cart note
  const updateNote = useCallback(
    (note: string) => {
      fetcher.submit(
        {
          action: 'UPDATE_NOTE',
          note,
        },
        { method: 'POST', action: '/cart' }
      );
    },
    [fetcher]
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        cartTotal,
        isOpen,
        isLoading,
        openCart,
        closeCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        applyDiscount,
        removeDiscount,
        updateNote,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

// Money formatter
function formatMoney(money: { amount: string; currencyCode: string }): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currencyCode,
  }).format(parseFloat(money.amount));
}
```

### 4.2 Cart Route Handler

```tsx
// app/routes/cart.tsx
// Cart page and API actions

import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@shopify/remix-oxygen';
import { useLoaderData, useFetcher } from '@remix-run/react';
import { CartForm, Money, Image, Analytics } from '@shopify/hydrogen';
import type { CartLineInput } from '@shopify/hydrogen/storefront-api-types';

// Cart mutations
const CART_MUTATIONS = {
  CREATE: `#graphql
    mutation CartCreate($input: CartInput!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
      cartCreate(input: $input) {
        cart {
          ...CartFragment
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  `,

  LINES_ADD: `#graphql
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          ...CartFragment
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  `,

  LINES_UPDATE: `#graphql
    mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart {
          ...CartFragment
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  `,

  LINES_REMOVE: `#graphql
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart {
          ...CartFragment
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  `,

  DISCOUNT_CODES_UPDATE: `#graphql
    mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!], $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
      cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
        cart {
          ...CartFragment
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  `,

  NOTE_UPDATE: `#graphql
    mutation CartNoteUpdate($cartId: ID!, $note: String!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
      cartNoteUpdate(cartId: $cartId, note: $note) {
        cart {
          ...CartFragment
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  `,

  BUYER_IDENTITY_UPDATE: `#graphql
    mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
      cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
        cart {
          ...CartFragment
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  `,
};

// Cart fragment for consistent data
const CART_FRAGMENT = `#graphql
  fragment CartFragment on Cart {
    id
    checkoutUrl
    totalQuantity
    note

    buyerIdentity {
      countryCode
      customer {
        id
        email
        firstName
        lastName
      }
      email
      phone
    }

    lines(first: 100) {
      nodes {
        id
        quantity

        attributes {
          key
          value
        }

        cost {
          totalAmount {
            amount
            currencyCode
          }
          compareAtAmountPerQuantity {
            amount
            currencyCode
          }
        }

        merchandise {
          ... on ProductVariant {
            id
            title

            selectedOptions {
              name
              value
            }

            image {
              url(transform: { maxWidth: 200, maxHeight: 200 })
              altText
              width
              height
            }

            price {
              amount
              currencyCode
            }

            product {
              id
              title
              handle
              vendor
            }
          }
        }
      }
    }

    cost {
      subtotalAmount {
        amount
        currencyCode
      }
      totalAmount {
        amount
        currencyCode
      }
      totalTaxAmount {
        amount
        currencyCode
      }
    }

    discountCodes {
      code
      applicable
    }

    discountAllocations {
      discountedAmount {
        amount
        currencyCode
      }
    }
  }
`;

// Loader - Get cart
export async function loader({ context }: LoaderFunctionArgs) {
  const { storefront, cart: cartHandler } = context;

  const cart = await cartHandler.get();

  return json({ cart });
}

// Action - Handle cart mutations
export async function action({ request, context }: ActionFunctionArgs) {
  const { storefront, cart: cartHandler } = context;

  const formData = await request.formData();
  const action = formData.get('action') as string;

  let result;

  switch (action) {
    case 'ADD_TO_CART': {
      const variantId = formData.get('variantId') as string;
      const quantity = parseInt(formData.get('quantity') as string) || 1;

      result = await cartHandler.addLines([
        { merchandiseId: variantId, quantity },
      ]);
      break;
    }

    case 'UPDATE_QUANTITY': {
      const lineId = formData.get('lineId') as string;
      const quantity = parseInt(formData.get('quantity') as string);

      if (quantity === 0) {
        result = await cartHandler.removeLines([lineId]);
      } else {
        result = await cartHandler.updateLines([{ id: lineId, quantity }]);
      }
      break;
    }

    case 'REMOVE_FROM_CART': {
      const lineId = formData.get('lineId') as string;
      result = await cartHandler.removeLines([lineId]);
      break;
    }

    case 'APPLY_DISCOUNT': {
      const discountCode = formData.get('discountCode') as string;
      const cart = await cartHandler.get();
      const existingCodes = cart?.discountCodes?.map((d) => d.code) || [];

      result = await cartHandler.updateDiscountCodes([
        ...existingCodes,
        discountCode,
      ]);
      break;
    }

    case 'REMOVE_DISCOUNT': {
      const discountCode = formData.get('discountCode') as string;
      const cart = await cartHandler.get();
      const existingCodes = cart?.discountCodes?.map((d) => d.code) || [];

      result = await cartHandler.updateDiscountCodes(
        existingCodes.filter((code) => code !== discountCode)
      );
      break;
    }

    case 'UPDATE_NOTE': {
      const note = formData.get('note') as string;
      result = await cartHandler.updateNote(note);
      break;
    }

    default:
      return json({ error: 'Invalid action' }, { status: 400 });
  }

  // Check for errors
  const errors = result?.userErrors || [];
  if (errors.length > 0) {
    return json({ errors }, { status: 400 });
  }

  return json({ cart: result?.cart });
}

// Cart page component
export default function CartPage() {
  const { cart } = useLoaderData<typeof loader>();

  if (!cart || cart.totalQuantity === 0) {
    return <EmptyCart />;
  }

  return (
    <div className="cart-page container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Your Cart</h1>

      {/* Analytics */}
      <Analytics.CartView />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2">
          <CartLines lines={cart.lines.nodes} />
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <CartSummary cart={cart} />
        </div>
      </div>
    </div>
  );
}

// Cart line item component
function CartLineItem({ line }: { line: CartLine }) {
  const fetcher = useFetcher();
  const isRemoving = fetcher.state !== 'idle';

  const { merchandise } = line;
  const product = merchandise.product;

  return (
    <div className={`flex gap-4 py-4 border-b ${isRemoving ? 'opacity-50' : ''}`}>
      {/* Image */}
      {merchandise.image && (
        <Image
          src={merchandise.image.url}
          alt={merchandise.image.altText || product.title}
          width={100}
          height={100}
          className="rounded"
        />
      )}

      {/* Details */}
      <div className="flex-1">
        <h3 className="font-semibold">{product.title}</h3>
        <p className="text-sm text-gray-600">{merchandise.title}</p>
        <p className="text-sm text-gray-500">{product.vendor}</p>

        {/* Quantity controls */}
        <div className="flex items-center gap-2 mt-2">
          <QuantitySelector
            lineId={line.id}
            quantity={line.quantity}
          />

          {/* Remove button */}
          <fetcher.Form method="post" action="/cart">
            <input type="hidden" name="action" value="REMOVE_FROM_CART" />
            <input type="hidden" name="lineId" value={line.id} />
            <button
              type="submit"
              className="text-red-500 text-sm hover:underline"
            >
              Remove
            </button>
          </fetcher.Form>
        </div>
      </div>

      {/* Price */}
      <div className="text-right">
        <Money data={line.cost.totalAmount} />
        {line.cost.compareAtAmountPerQuantity && (
          <Money
            data={line.cost.compareAtAmountPerQuantity}
            className="text-sm text-gray-500 line-through"
          />
        )}
      </div>
    </div>
  );
}

// Quantity selector component
function QuantitySelector({ lineId, quantity }: { lineId: string; quantity: number }) {
  const fetcher = useFetcher();

  const handleQuantityChange = (newQuantity: number) => {
    fetcher.submit(
      {
        action: 'UPDATE_QUANTITY',
        lineId,
        quantity: String(newQuantity),
      },
      { method: 'POST', action: '/cart' }
    );
  };

  return (
    <div className="flex items-center border rounded">
      <button
        onClick={() => handleQuantityChange(quantity - 1)}
        disabled={quantity <= 1}
        className="px-3 py-1 hover:bg-gray-100 disabled:opacity-50"
      >
        -
      </button>
      <span className="px-3 py-1 border-x">{quantity}</span>
      <button
        onClick={() => handleQuantityChange(quantity + 1)}
        className="px-3 py-1 hover:bg-gray-100"
      >
        +
      </button>
    </div>
  );
}

// Cart summary component
function CartSummary({ cart }: { cart: Cart }) {
  return (
    <div className="bg-gray-50 p-6 rounded-lg sticky top-4">
      <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

      {/* Discount code input */}
      <DiscountForm />

      {/* Applied discounts */}
      {cart.discountCodes?.length > 0 && (
        <div className="mb-4">
          {cart.discountCodes.map((discount) => (
            <AppliedDiscount key={discount.code} discount={discount} />
          ))}
        </div>
      )}

      {/* Totals */}
      <div className="space-y-2 border-t pt-4">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <Money data={cart.cost.subtotalAmount} />
        </div>

        {cart.cost.totalTaxAmount && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>Tax</span>
            <Money data={cart.cost.totalTaxAmount} />
          </div>
        )}

        <div className="flex justify-between font-bold text-lg border-t pt-2">
          <span>Total</span>
          <Money data={cart.cost.totalAmount} />
        </div>
      </div>

      {/* Checkout button */}
      <a
        href={cart.checkoutUrl}
        className="block w-full bg-black text-white text-center py-3 rounded-lg mt-6 hover:bg-gray-800 transition"
      >
        Proceed to Checkout
      </a>

      {/* Order note */}
      <CartNote currentNote={cart.note || ''} />
    </div>
  );
}

// Discount form component
function DiscountForm() {
  const fetcher = useFetcher();
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    fetcher.submit(
      { action: 'APPLY_DISCOUNT', discountCode: code },
      { method: 'POST', action: '/cart' }
    );
    setCode('');
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <label className="block text-sm font-medium mb-2">
        Discount Code
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter code"
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          type="submit"
          disabled={fetcher.state !== 'idle'}
          className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
        >
          Apply
        </button>
      </div>
    </form>
  );
}

// Empty cart component
function EmptyCart() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
      <p className="text-gray-600 mb-8">
        Looks like you haven't added anything yet.
      </p>
      <a
        href="/collections/all"
        className="inline-block bg-black text-white px-8 py-3 rounded hover:bg-gray-800"
      >
        Continue Shopping
      </a>
    </div>
  );
}
```

### 4.3 Add to Cart Button Component

```tsx
// components/AddToCartButton.tsx
// Reusable add to cart button with variants

import { useFetcher } from '@remix-run/react';
import { CartForm, type OptimisticCartLine } from '@shopify/hydrogen';
import { useCart } from '~/components/CartProvider';
import { cn } from '~/lib/utils';

interface AddToCartButtonProps {
  variantId: string;
  quantity?: number;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  attributes?: Array<{ key: string; value: string }>;
  onSuccess?: () => void;
}

export function AddToCartButton({
  variantId,
  quantity = 1,
  disabled = false,
  className,
  children = 'Add to Cart',
  attributes = [],
  onSuccess,
}: AddToCartButtonProps) {
  const { openCart } = useCart();
  const fetcher = useFetcher();

  const isLoading = fetcher.state !== 'idle';
  const isDisabled = disabled || !variantId || isLoading;

  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.LinesAdd}
      inputs={{
        lines: [
          {
            merchandiseId: variantId,
            quantity,
            attributes,
          },
        ],
      }}
    >
      {(fetcher) => (
        <button
          type="submit"
          disabled={isDisabled}
          onClick={() => {
            if (!isDisabled) {
              // Open cart after adding
              setTimeout(() => {
                openCart();
                onSuccess?.();
              }, 500);
            }
          }}
          className={cn(
            'w-full py-3 px-6 rounded-lg font-medium transition-all',
            'bg-black text-white hover:bg-gray-800',
            'disabled:bg-gray-300 disabled:cursor-not-allowed',
            isLoading && 'animate-pulse',
            className
          )}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinner />
              Adding...
            </span>
          ) : (
            children
          )}
        </button>
      )}
    </CartForm>
  );
}

// Quick add button (for collection pages)
export function QuickAddButton({
  variantId,
  productTitle,
}: {
  variantId: string;
  productTitle: string;
}) {
  return (
    <AddToCartButton
      variantId={variantId}
      className="opacity-0 group-hover:opacity-100 absolute bottom-4 left-4 right-4 transition-opacity"
    >
      Quick Add
    </AddToCartButton>
  );
}

// Buy now button (skip cart, go to checkout)
export function BuyNowButton({
  variantId,
  quantity = 1,
  disabled = false,
  className,
}: {
  variantId: string;
  quantity?: number;
  disabled?: boolean;
  className?: string;
}) {
  const fetcher = useFetcher();

  const handleBuyNow = async () => {
    // Create new cart with this item and redirect to checkout
    fetcher.submit(
      {
        action: 'BUY_NOW',
        variantId,
        quantity: String(quantity),
      },
      { method: 'POST', action: '/cart/buy-now' }
    );
  };

  return (
    <button
      onClick={handleBuyNow}
      disabled={disabled || !variantId || fetcher.state !== 'idle'}
      className={cn(
        'w-full py-3 px-6 rounded-lg font-medium transition-all',
        'bg-white text-black border-2 border-black hover:bg-gray-100',
        'disabled:bg-gray-100 disabled:border-gray-300 disabled:cursor-not-allowed',
        className
      )}
    >
      Buy Now
    </button>
  );
}

// Loading spinner
function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
```

### 4.4 Cart Drawer Component

```tsx
// components/CartDrawer.tsx
// Slide-out cart drawer

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useCart } from '~/components/CartProvider';
import { CartLineItem } from '~/components/CartLineItem';
import { Money, Image } from '@shopify/hydrogen';

export function CartDrawer() {
  const { cart, isOpen, closeCart, cartCount, cartTotal } = useCart();

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeCart}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-white shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-6 border-b">
                      <Dialog.Title className="text-lg font-semibold">
                        Shopping Cart ({cartCount})
                      </Dialog.Title>
                      <button
                        type="button"
                        onClick={closeCart}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>

                    {/* Cart content */}
                    <div className="flex-1 overflow-y-auto px-4 py-6">
                      {!cart || cart.totalQuantity === 0 ? (
                        <EmptyCartDrawer onClose={closeCart} />
                      ) : (
                        <div className="space-y-4">
                          {cart.lines.nodes.map((line) => (
                            <CartDrawerLineItem
                              key={line.id}
                              line={line}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {cart && cart.totalQuantity > 0 && (
                      <div className="border-t px-4 py-6">
                        {/* Subtotal */}
                        <div className="flex justify-between text-base font-medium mb-4">
                          <span>Subtotal</span>
                          <Money data={cart.cost.subtotalAmount} />
                        </div>

                        <p className="text-sm text-gray-500 mb-4">
                          Shipping and taxes calculated at checkout.
                        </p>

                        {/* Checkout button */}
                        <a
                          href={cart.checkoutUrl}
                          className="flex items-center justify-center w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition"
                        >
                          Checkout
                        </a>

                        {/* Continue shopping */}
                        <button
                          type="button"
                          onClick={closeCart}
                          className="w-full mt-4 text-center text-sm text-gray-600 hover:text-gray-800"
                        >
                          Continue Shopping →
                        </button>
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

// Cart drawer line item (compact version)
function CartDrawerLineItem({ line }: { line: CartLine }) {
  const { updateQuantity, removeFromCart } = useCart();
  const { merchandise } = line;
  const product = merchandise.product;

  return (
    <div className="flex gap-4">
      {/* Image */}
      {merchandise.image && (
        <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border">
          <Image
            src={merchandise.image.url}
            alt={merchandise.image.altText || product.title}
            width={96}
            height={96}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Details */}
      <div className="flex flex-1 flex-col">
        <div className="flex justify-between text-base font-medium">
          <h3>
            <a href={`/products/${product.handle}`}>{product.title}</a>
          </h3>
          <Money data={line.cost.totalAmount} />
        </div>

        <p className="mt-1 text-sm text-gray-500">{merchandise.title}</p>

        {/* Quantity and remove */}
        <div className="flex items-center justify-between mt-auto pt-2">
          <div className="flex items-center border rounded">
            <button
              onClick={() => updateQuantity(line.id, line.quantity - 1)}
              className="px-2 py-1 hover:bg-gray-100"
            >
              -
            </button>
            <span className="px-2 py-1 border-x text-sm">{line.quantity}</span>
            <button
              onClick={() => updateQuantity(line.id, line.quantity + 1)}
              className="px-2 py-1 hover:bg-gray-100"
            >
              +
            </button>
          </div>

          <button
            onClick={() => removeFromCart(line.id)}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// Empty cart drawer
function EmptyCartDrawer({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <svg
        className="h-16 w-16 text-gray-300 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
      <p className="text-gray-500 mb-4">Your cart is empty</p>
      <button
        onClick={onClose}
        className="text-black underline hover:no-underline"
      >
        Continue Shopping
      </button>
    </div>
  );
}
```

---

## PART 5: CUSTOMER AUTHENTICATION & ACCOUNTS

### 5.1 Customer Account API Setup

```typescript
// lib/customer.ts
// Customer authentication and account management

import { createCustomerAccountClient } from '@shopify/hydrogen';

// Types
interface CustomerAccessToken {
  accessToken: string;
  expiresAt: string;
}

interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  acceptsMarketing: boolean;
  defaultAddress?: Address;
  addresses: Address[];
  orders: Order[];
}

interface Address {
  id: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  provinceCode: string;
  country: string;
  countryCode: string;
  zip: string;
  phone?: string;
  firstName: string;
  lastName: string;
  company?: string;
  formatted: string[];
}

// Customer mutations
export const CUSTOMER_MUTATIONS = {
  // Create account
  CREATE: `#graphql
    mutation CustomerCreate($input: CustomerCreateInput!) {
      customerCreate(input: $input) {
        customer {
          id
          email
          firstName
          lastName
        }
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `,

  // Login
  ACCESS_TOKEN_CREATE: `#graphql
    mutation CustomerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
      customerAccessTokenCreate(input: $input) {
        customerAccessToken {
          accessToken
          expiresAt
        }
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `,

  // Logout
  ACCESS_TOKEN_DELETE: `#graphql
    mutation CustomerAccessTokenDelete($customerAccessToken: String!) {
      customerAccessTokenDelete(customerAccessToken: $customerAccessToken) {
        deletedAccessToken
        deletedCustomerAccessTokenId
        userErrors {
          field
          message
        }
      }
    }
  `,

  // Renew token
  ACCESS_TOKEN_RENEW: `#graphql
    mutation CustomerAccessTokenRenew($customerAccessToken: String!) {
      customerAccessTokenRenew(customerAccessToken: $customerAccessToken) {
        customerAccessToken {
          accessToken
          expiresAt
        }
        userErrors {
          field
          message
        }
      }
    }
  `,

  // Password recovery
  RECOVER: `#graphql
    mutation CustomerRecover($email: String!) {
      customerRecover(email: $email) {
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `,

  // Reset password
  RESET: `#graphql
    mutation CustomerReset($id: ID!, $input: CustomerResetInput!) {
      customerReset(id: $id, input: $input) {
        customer {
          id
          email
        }
        customerAccessToken {
          accessToken
          expiresAt
        }
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `,

  // Update customer
  UPDATE: `#graphql
    mutation CustomerUpdate(
      $customerAccessToken: String!
      $customer: CustomerUpdateInput!
    ) {
      customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
        customer {
          id
          email
          firstName
          lastName
          phone
          acceptsMarketing
        }
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `,

  // Create address
  ADDRESS_CREATE: `#graphql
    mutation CustomerAddressCreate(
      $customerAccessToken: String!
      $address: MailingAddressInput!
    ) {
      customerAddressCreate(customerAccessToken: $customerAccessToken, address: $address) {
        customerAddress {
          id
        }
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `,

  // Update address
  ADDRESS_UPDATE: `#graphql
    mutation CustomerAddressUpdate(
      $customerAccessToken: String!
      $id: ID!
      $address: MailingAddressInput!
    ) {
      customerAddressUpdate(
        customerAccessToken: $customerAccessToken
        id: $id
        address: $address
      ) {
        customerAddress {
          id
        }
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `,

  // Delete address
  ADDRESS_DELETE: `#graphql
    mutation CustomerAddressDelete($customerAccessToken: String!, $id: ID!) {
      customerAddressDelete(customerAccessToken: $customerAccessToken, id: $id) {
        customerUserErrors {
          code
          field
          message
        }
        deletedCustomerAddressId
      }
    }
  `,

  // Set default address
  DEFAULT_ADDRESS_UPDATE: `#graphql
    mutation CustomerDefaultAddressUpdate(
      $customerAccessToken: String!
      $addressId: ID!
    ) {
      customerDefaultAddressUpdate(
        customerAccessToken: $customerAccessToken
        addressId: $addressId
      ) {
        customer {
          id
          defaultAddress {
            id
          }
        }
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `,
};

// Customer queries
export const CUSTOMER_QUERIES = {
  // Get customer profile
  PROFILE: `#graphql
    query CustomerProfile($customerAccessToken: String!) {
      customer(customerAccessToken: $customerAccessToken) {
        id
        email
        firstName
        lastName
        phone
        acceptsMarketing
        createdAt

        defaultAddress {
          ...AddressFragment
        }

        addresses(first: 10) {
          nodes {
            ...AddressFragment
          }
        }
      }
    }

    fragment AddressFragment on MailingAddress {
      id
      address1
      address2
      city
      province
      provinceCode
      country
      countryCode
      zip
      phone
      firstName
      lastName
      company
      formatted
    }
  `,

  // Get customer orders
  ORDERS: `#graphql
    query CustomerOrders(
      $customerAccessToken: String!
      $first: Int!
      $after: String
    ) {
      customer(customerAccessToken: $customerAccessToken) {
        orders(first: $first, after: $after, sortKey: PROCESSED_AT, reverse: true) {
          pageInfo {
            hasNextPage
            endCursor
          }

          nodes {
            id
            orderNumber
            name
            processedAt
            financialStatus
            fulfillmentStatus

            currentTotalPrice {
              amount
              currencyCode
            }

            lineItems(first: 50) {
              nodes {
                title
                quantity
                variant {
                  image {
                    url(transform: { maxWidth: 100 })
                    altText
                  }
                }
              }
            }

            shippingAddress {
              formatted
            }
          }
        }
      }
    }
  `,

  // Get single order
  ORDER: `#graphql
    query CustomerOrder($customerAccessToken: String!, $orderId: ID!) {
      customer(customerAccessToken: $customerAccessToken) {
        order(id: $orderId) {
          id
          orderNumber
          name
          processedAt
          financialStatus
          fulfillmentStatus

          subtotalPrice {
            amount
            currencyCode
          }

          totalShippingPrice {
            amount
            currencyCode
          }

          totalTax {
            amount
            currencyCode
          }

          totalPrice {
            amount
            currencyCode
          }

          lineItems(first: 100) {
            nodes {
              title
              quantity
              originalTotalPrice {
                amount
                currencyCode
              }
              variant {
                id
                title
                image {
                  url(transform: { maxWidth: 200 })
                  altText
                }
                product {
                  handle
                }
              }
            }
          }

          shippingAddress {
            ...AddressFragment
          }

          billingAddress {
            ...AddressFragment
          }

          successfulFulfillments(first: 10) {
            trackingInfo {
              number
              url
            }
          }
        }
      }
    }
  `,
};
```

### 5.2 Authentication Routes

```tsx
// app/routes/account.login.tsx
// Customer login page

import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '@shopify/remix-oxygen';
import { Form, useActionData, useNavigation } from '@remix-run/react';
import { CUSTOMER_MUTATIONS } from '~/lib/customer';

export async function loader({ context }: LoaderFunctionArgs) {
  const { session } = context;
  const customerAccessToken = await session.get('customerAccessToken');

  // Redirect if already logged in
  if (customerAccessToken) {
    return redirect('/account');
  }

  return json({});
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { storefront, session } = context;
  const formData = await request.formData();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return json(
      { error: 'Please provide email and password' },
      { status: 400 }
    );
  }

  try {
    const { customerAccessTokenCreate } = await storefront.mutate(
      CUSTOMER_MUTATIONS.ACCESS_TOKEN_CREATE,
      {
        variables: {
          input: { email, password },
        },
      }
    );

    const { customerAccessToken, customerUserErrors } =
      customerAccessTokenCreate;

    if (customerUserErrors?.length) {
      return json(
        { error: customerUserErrors[0].message },
        { status: 400 }
      );
    }

    if (!customerAccessToken?.accessToken) {
      return json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Store token in session
    session.set('customerAccessToken', customerAccessToken.accessToken);

    // Redirect to account page
    return redirect('/account', {
      headers: {
        'Set-Cookie': await context.session.commit(),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <h1 className="text-3xl font-bold mb-8 text-center">Sign In</h1>

      <Form method="post" className="space-y-6">
        {actionData?.error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            {actionData.error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </Form>

      <div className="mt-6 text-center space-y-4">
        <a
          href="/account/recover"
          className="text-sm text-gray-600 hover:text-black"
        >
          Forgot your password?
        </a>

        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <a href="/account/register" className="text-black underline">
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
```

### 5.3 Registration Route

```tsx
// app/routes/account.register.tsx
// Customer registration page

import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '@shopify/remix-oxygen';
import { Form, useActionData, useNavigation } from '@remix-run/react';
import { CUSTOMER_MUTATIONS } from '~/lib/customer';

export async function loader({ context }: LoaderFunctionArgs) {
  const { session } = context;
  const customerAccessToken = await session.get('customerAccessToken');

  if (customerAccessToken) {
    return redirect('/account');
  }

  return json({});
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { storefront, session } = context;
  const formData = await request.formData();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const acceptsMarketing = formData.get('acceptsMarketing') === 'on';

  // Validate
  if (!email || !password || !firstName || !lastName) {
    return json(
      { error: 'Please fill in all required fields' },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 }
    );
  }

  try {
    // Create customer
    const { customerCreate } = await storefront.mutate(
      CUSTOMER_MUTATIONS.CREATE,
      {
        variables: {
          input: {
            email,
            password,
            firstName,
            lastName,
            acceptsMarketing,
          },
        },
      }
    );

    const { customer, customerUserErrors } = customerCreate;

    if (customerUserErrors?.length) {
      return json(
        { error: customerUserErrors[0].message },
        { status: 400 }
      );
    }

    if (!customer) {
      return json(
        { error: 'Could not create account' },
        { status: 500 }
      );
    }

    // Auto-login after registration
    const { customerAccessTokenCreate } = await storefront.mutate(
      CUSTOMER_MUTATIONS.ACCESS_TOKEN_CREATE,
      {
        variables: {
          input: { email, password },
        },
      }
    );

    const { customerAccessToken } = customerAccessTokenCreate;

    if (customerAccessToken?.accessToken) {
      session.set('customerAccessToken', customerAccessToken.accessToken);
    }

    return redirect('/account', {
      headers: {
        'Set-Cookie': await context.session.commit(),
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

export default function RegisterPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <h1 className="text-3xl font-bold mb-8 text-center">Create Account</h1>

      <Form method="post" className="space-y-6">
        {actionData?.error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            {actionData.error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium mb-2">
              First Name *
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              autoComplete="given-name"
              className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium mb-2">
              Last Name *
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              autoComplete="family-name"
              className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            Password *
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
          />
          <p className="text-xs text-gray-500 mt-1">
            At least 8 characters
          </p>
        </div>

        <div className="flex items-start gap-3">
          <input
            id="acceptsMarketing"
            name="acceptsMarketing"
            type="checkbox"
            className="mt-1 rounded border-gray-300"
          />
          <label htmlFor="acceptsMarketing" className="text-sm text-gray-600">
            Subscribe to our newsletter for exclusive offers and updates
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </button>
      </Form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <a href="/account/login" className="text-black underline">
          Sign in
        </a>
      </p>
    </div>
  );
}
```

### 5.4 Account Dashboard

```tsx
// app/routes/account._index.tsx
// Customer account dashboard

import { json, redirect, type LoaderFunctionArgs } from '@shopify/remix-oxygen';
import { useLoaderData, Link } from '@remix-run/react';
import { Money, Image } from '@shopify/hydrogen';
import { CUSTOMER_QUERIES } from '~/lib/customer';

export async function loader({ context }: LoaderFunctionArgs) {
  const { storefront, session } = context;
  const customerAccessToken = await session.get('customerAccessToken');

  if (!customerAccessToken) {
    return redirect('/account/login');
  }

  try {
    const [{ customer }, { customer: customerOrders }] = await Promise.all([
      storefront.query(CUSTOMER_QUERIES.PROFILE, {
        variables: { customerAccessToken },
      }),
      storefront.query(CUSTOMER_QUERIES.ORDERS, {
        variables: { customerAccessToken, first: 5 },
      }),
    ]);

    if (!customer) {
      // Token expired or invalid
      session.unset('customerAccessToken');
      return redirect('/account/login', {
        headers: {
          'Set-Cookie': await context.session.commit(),
        },
      });
    }

    return json({
      customer,
      orders: customerOrders?.orders?.nodes || [],
    });
  } catch (error) {
    console.error('Account error:', error);
    return redirect('/account/login');
  }
}

export default function AccountDashboard() {
  const { customer, orders } = useLoaderData<typeof loader>();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        Welcome, {customer.firstName}!
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Account Details</h2>

            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Name</span>
                <p>{customer.firstName} {customer.lastName}</p>
              </div>

              <div>
                <span className="text-sm text-gray-500">Email</span>
                <p>{customer.email}</p>
              </div>

              {customer.phone && (
                <div>
                  <span className="text-sm text-gray-500">Phone</span>
                  <p>{customer.phone}</p>
                </div>
              )}
            </div>

            <Link
              to="/account/profile"
              className="block mt-4 text-sm text-blue-600 hover:underline"
            >
              Edit Profile →
            </Link>
          </div>

          {/* Default address */}
          {customer.defaultAddress && (
            <div className="bg-white rounded-lg border p-6 mt-6">
              <h2 className="text-xl font-semibold mb-4">Default Address</h2>

              <address className="not-italic text-gray-600">
                {customer.defaultAddress.formatted.map((line, i) => (
                  <span key={i}>
                    {line}
                    <br />
                  </span>
                ))}
              </address>

              <Link
                to="/account/addresses"
                className="block mt-4 text-sm text-blue-600 hover:underline"
              >
                Manage Addresses →
              </Link>
            </div>
          )}
        </div>

        {/* Orders section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Recent Orders</h2>
              <Link
                to="/account/orders"
                className="text-sm text-blue-600 hover:underline"
              >
                View All →
              </Link>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No orders yet</p>
                <Link
                  to="/collections/all"
                  className="inline-block bg-black text-white px-6 py-2 rounded-lg"
                >
                  Start Shopping
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <QuickLink to="/account/orders" icon="📦" label="Orders" />
        <QuickLink to="/account/addresses" icon="📍" label="Addresses" />
        <QuickLink to="/account/profile" icon="👤" label="Profile" />
        <QuickLink to="/account/logout" icon="🚪" label="Sign Out" />
      </div>
    </div>
  );
}

function OrderCard({ order }) {
  return (
    <Link
      to={`/account/orders/${order.id.split('/').pop()}`}
      className="block border rounded-lg p-4 hover:border-gray-400 transition"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-medium">Order {order.name}</p>
          <p className="text-sm text-gray-500">
            {new Date(order.processedAt).toLocaleDateString()}
          </p>
        </div>
        <Money
          data={order.currentTotalPrice}
          className="font-medium"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-1 rounded ${
          order.financialStatus === 'PAID'
            ? 'bg-green-100 text-green-800'
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {order.financialStatus}
        </span>
        <span className={`text-xs px-2 py-1 rounded ${
          order.fulfillmentStatus === 'FULFILLED'
            ? 'bg-green-100 text-green-800'
            : 'bg-blue-100 text-blue-800'
        }`}>
          {order.fulfillmentStatus || 'UNFULFILLED'}
        </span>
      </div>

      {/* Order preview images */}
      <div className="flex gap-2 mt-3">
        {order.lineItems.nodes.slice(0, 3).map((item, i) => (
          item.variant?.image && (
            <Image
              key={i}
              src={item.variant.image.url}
              alt={item.variant.image.altText || item.title}
              width={50}
              height={50}
              className="rounded border"
            />
          )
        ))}
        {order.lineItems.nodes.length > 3 && (
          <div className="w-[50px] h-[50px] rounded border flex items-center justify-center bg-gray-100 text-sm">
            +{order.lineItems.nodes.length - 3}
          </div>
        )}
      </div>
    </Link>
  );
}

function QuickLink({ to, icon, label }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center p-6 bg-white border rounded-lg hover:border-gray-400 transition"
    >
      <span className="text-2xl mb-2">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
```

---

## PART 6: PRODUCT CATALOG MANAGEMENT

### 6.1 Product Page Component

```tsx
// components/ProductDetails.tsx
// Full product page component with variant selection

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from '@remix-run/react';
import { Money, Image, ShopPayButton } from '@shopify/hydrogen';
import { AddToCartButton, BuyNowButton } from '~/components/AddToCartButton';
import { ProductGallery } from '~/components/ProductGallery';
import { ProductOptions } from '~/components/ProductOptions';
import { QuantitySelector } from '~/components/QuantitySelector';
import type { Product, ProductVariant } from '@shopify/hydrogen/storefront-api-types';

interface ProductDetailsProps {
  product: Product;
  selectedVariant: ProductVariant | null;
}

export function ProductDetails({ product, selectedVariant }: ProductDetailsProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);

  // Get current variant or first available
  const variant = selectedVariant || product.variants.nodes[0];

  // Check availability
  const isAvailable = variant?.availableForSale ?? false;
  const isOnSale = variant?.compareAtPrice &&
    parseFloat(variant.compareAtPrice.amount) > parseFloat(variant.price.amount);

  // Handle option change
  const handleOptionChange = (optionName: string, optionValue: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set(optionName, optionValue);
    navigate(`?${newSearchParams.toString()}`, { replace: true });
  };

  // Find variant by selected options
  const findVariantByOptions = (options: Record<string, string>) => {
    return product.variants.nodes.find((v) =>
      v.selectedOptions.every(
        (opt) => options[opt.name] === opt.value
      )
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      {/* Product gallery */}
      <div>
        <ProductGallery
          media={product.media.nodes}
          selectedVariant={variant}
        />
      </div>

      {/* Product info */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-4">
          <a href="/" className="hover:text-black">Home</a>
          {' / '}
          <a href="/collections/all" className="hover:text-black">Products</a>
          {' / '}
          <span className="text-black">{product.title}</span>
        </nav>

        {/* Vendor */}
        {product.vendor && (
          <p className="text-sm text-gray-500 uppercase tracking-wide">
            {product.vendor}
          </p>
        )}

        {/* Title */}
        <h1 className="text-3xl font-bold mb-4">{product.title}</h1>

        {/* Reviews (if using metafields) */}
        {product.reviewsAverage && (
          <div className="flex items-center gap-2 mb-4">
            <Stars rating={parseFloat(product.reviewsAverage.value)} />
            <span className="text-sm text-gray-600">
              ({product.reviewsCount?.value || 0} reviews)
            </span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-3 mb-6">
          <Money
            data={variant.price}
            className={`text-2xl font-bold ${isOnSale ? 'text-red-600' : ''}`}
          />
          {isOnSale && (
            <>
              <Money
                data={variant.compareAtPrice!}
                className="text-lg text-gray-500 line-through"
              />
              <span className="bg-red-100 text-red-600 text-sm px-2 py-1 rounded">
                {Math.round(
                  (1 - parseFloat(variant.price.amount) /
                   parseFloat(variant.compareAtPrice!.amount)) * 100
                )}% OFF
              </span>
            </>
          )}
        </div>

        {/* Options */}
        <ProductOptions
          options={product.options}
          selectedOptions={variant.selectedOptions}
          variants={product.variants.nodes}
          onOptionChange={handleOptionChange}
        />

        {/* Quantity */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Quantity</label>
          <QuantitySelector
            value={quantity}
            onChange={setQuantity}
            max={variant.quantityAvailable || 99}
          />
        </div>

        {/* Add to cart / Buy now */}
        <div className="space-y-3">
          <AddToCartButton
            variantId={variant.id}
            quantity={quantity}
            disabled={!isAvailable}
          >
            {isAvailable ? 'Add to Cart' : 'Sold Out'}
          </AddToCartButton>

          {isAvailable && (
            <>
              <BuyNowButton
                variantId={variant.id}
                quantity={quantity}
              />

              {/* Shop Pay */}
              <ShopPayButton
                variantIds={[variant.id]}
                className="w-full"
              />
            </>
          )}
        </div>

        {/* Stock status */}
        {variant.quantityAvailable && variant.quantityAvailable <= 5 && (
          <p className="text-orange-600 text-sm mt-4">
            Only {variant.quantityAvailable} left in stock!
          </p>
        )}

        {/* Description */}
        <div className="mt-8 pt-8 border-t">
          <h2 className="text-lg font-semibold mb-4">Description</h2>
          <div
            className="prose prose-sm"
            dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
          />
        </div>

        {/* Specifications (from metafields) */}
        {product.specifications && (
          <div className="mt-6 pt-6 border-t">
            <h2 className="text-lg font-semibold mb-4">Specifications</h2>
            <ProductSpecifications
              data={JSON.parse(product.specifications.value)}
            />
          </div>
        )}

        {/* Share */}
        <div className="mt-6 pt-6 border-t">
          <ShareButtons product={product} />
        </div>
      </div>
    </div>
  );
}

// Product options selector
function ProductOptions({
  options,
  selectedOptions,
  variants,
  onOptionChange,
}: {
  options: Product['options'];
  selectedOptions: ProductVariant['selectedOptions'];
  variants: ProductVariant[];
  onOptionChange: (name: string, value: string) => void;
}) {
  // Check if option value is available
  const isOptionAvailable = (optionName: string, optionValue: string) => {
    const currentOptions = Object.fromEntries(
      selectedOptions.map((opt) => [opt.name, opt.value])
    );

    // Try to find a variant with this option
    const testOptions = { ...currentOptions, [optionName]: optionValue };

    return variants.some((variant) =>
      variant.selectedOptions.every(
        (opt) => testOptions[opt.name] === opt.value
      ) && variant.availableForSale
    );
  };

  return (
    <div className="space-y-6 mb-6">
      {options.map((option) => (
        <div key={option.name}>
          <label className="block text-sm font-medium mb-2">
            {option.name}
          </label>

          {/* Color swatches */}
          {option.name.toLowerCase() === 'color' ? (
            <ColorSwatches
              values={option.values}
              selectedValue={
                selectedOptions.find((o) => o.name === option.name)?.value
              }
              onSelect={(value) => onOptionChange(option.name, value)}
              isAvailable={(value) => isOptionAvailable(option.name, value)}
            />
          ) : (
            /* Regular options (size, material, etc.) */
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const isSelected = selectedOptions.some(
                  (o) => o.name === option.name && o.value === value
                );
                const available = isOptionAvailable(option.name, value);

                return (
                  <button
                    key={value}
                    onClick={() => onOptionChange(option.name, value)}
                    disabled={!available}
                    className={`
                      px-4 py-2 border rounded-lg transition
                      ${isSelected
                        ? 'border-black bg-black text-white'
                        : available
                        ? 'border-gray-300 hover:border-gray-400'
                        : 'border-gray-200 text-gray-300 cursor-not-allowed line-through'
                      }
                    `}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Color swatches component
function ColorSwatches({
  values,
  selectedValue,
  onSelect,
  isAvailable,
}: {
  values: string[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  isAvailable: (value: string) => boolean;
}) {
  // Map color names to hex codes
  const colorMap: Record<string, string> = {
    black: '#000000',
    white: '#FFFFFF',
    red: '#EF4444',
    blue: '#3B82F6',
    green: '#22C55E',
    yellow: '#EAB308',
    pink: '#EC4899',
    purple: '#A855F7',
    orange: '#F97316',
    gray: '#6B7280',
    grey: '#6B7280',
    brown: '#92400E',
    navy: '#1E3A5F',
    beige: '#F5F5DC',
    cream: '#FFFDD0',
  };

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => {
        const isSelected = selectedValue === value;
        const available = isAvailable(value);
        const colorCode = colorMap[value.toLowerCase()] || '#CCCCCC';

        return (
          <button
            key={value}
            onClick={() => onSelect(value)}
            disabled={!available}
            title={value}
            className={`
              w-10 h-10 rounded-full border-2 transition relative
              ${isSelected ? 'border-black ring-2 ring-offset-2 ring-black' : 'border-gray-300'}
              ${!available ? 'opacity-50 cursor-not-allowed' : 'hover:ring-2 hover:ring-offset-2 hover:ring-gray-300'}
            `}
            style={{ backgroundColor: colorCode }}
          >
            {!available && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-full h-0.5 bg-gray-400 rotate-45 transform" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Star rating display
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-5 h-5 ${
            star <= rating ? 'text-yellow-400' : 'text-gray-300'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}
```

### 6.2 Product Gallery Component

```tsx
// components/ProductGallery.tsx
// Product image gallery with zoom and video support

import { useState, useRef } from 'react';
import { Image, Video } from '@shopify/hydrogen';
import type { MediaImage, Video as VideoType, Model3d } from '@shopify/hydrogen/storefront-api-types';

type MediaNode = MediaImage | VideoType | Model3d;

interface ProductGalleryProps {
  media: MediaNode[];
  selectedVariant?: { image?: { url: string } };
}

export function ProductGallery({ media, selectedVariant }: ProductGalleryProps) {
  // Find the selected variant image index
  const selectedImageIndex = selectedVariant?.image
    ? media.findIndex(
        (m) => m.__typename === 'MediaImage' && m.image?.url === selectedVariant.image?.url
      )
    : 0;

  const [activeIndex, setActiveIndex] = useState(
    selectedImageIndex >= 0 ? selectedImageIndex : 0
  );
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const imageRef = useRef<HTMLDivElement>(null);

  const activeMedia = media[activeIndex];

  // Handle zoom
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setZoomPosition({ x, y });
  };

  return (
    <div className="space-y-4">
      {/* Main image/video */}
      <div
        ref={imageRef}
        className={`
          relative aspect-square overflow-hidden rounded-lg bg-gray-100
          ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}
        `}
        onClick={() => setIsZoomed(!isZoomed)}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setIsZoomed(false)}
      >
        {activeMedia.__typename === 'MediaImage' && activeMedia.image && (
          <Image
            src={activeMedia.image.url}
            alt={activeMedia.image.altText || 'Product image'}
            width={1200}
            height={1200}
            className={`
              w-full h-full object-cover transition-transform duration-200
              ${isZoomed ? 'scale-150' : 'scale-100'}
            `}
            style={
              isZoomed
                ? {
                    transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                  }
                : undefined
            }
          />
        )}

        {activeMedia.__typename === 'Video' && (
          <Video
            data={activeMedia}
            className="w-full h-full object-cover"
            controls
          />
        )}

        {activeMedia.__typename === 'Model3d' && (
          <model-viewer
            src={activeMedia.sources[0]?.url}
            alt="3D model"
            auto-rotate
            camera-controls
            className="w-full h-full"
          />
        )}

        {/* Navigation arrows */}
        {media.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white"
            >
              ←
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white"
            >
              →
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {media.map((item, index) => (
            <button
              key={item.id || index}
              onClick={() => setActiveIndex(index)}
              className={`
                flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition
                ${activeIndex === index ? 'border-black' : 'border-transparent hover:border-gray-300'}
              `}
            >
              {item.__typename === 'MediaImage' && item.image && (
                <Image
                  src={item.image.url}
                  alt={item.image.altText || `Thumbnail ${index + 1}`}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              )}
              {item.__typename === 'Video' && (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-2xl">▶</span>
                </div>
              )}
              {item.__typename === 'Model3d' && (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-sm">3D</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## PART 7: SEARCH, FILTERING & COLLECTIONS

### 7.1 Collection Page with Filtering

```tsx
// app/routes/collections.$handle.tsx
// Collection page with advanced filtering

import { json, type LoaderFunctionArgs } from '@shopify/remix-oxygen';
import { useLoaderData, useSearchParams, useNavigate } from '@remix-run/react';
import { getPaginationVariables, Analytics } from '@shopify/hydrogen';
import { ProductGrid } from '~/components/ProductGrid';
import { CollectionFilters } from '~/components/CollectionFilters';
import { SortDropdown } from '~/components/SortDropdown';
import { Pagination } from '~/components/Pagination';
import { COLLECTION_QUERY } from '~/lib/queries';

// Sort options
const SORT_OPTIONS = [
  { label: 'Featured', key: 'MANUAL', reverse: false },
  { label: 'Best Selling', key: 'BEST_SELLING', reverse: false },
  { label: 'Newest', key: 'CREATED', reverse: true },
  { label: 'Price: Low to High', key: 'PRICE', reverse: false },
  { label: 'Price: High to Low', key: 'PRICE', reverse: true },
  { label: 'A-Z', key: 'TITLE', reverse: false },
  { label: 'Z-A', key: 'TITLE', reverse: true },
];

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const { handle } = params;
  const { storefront } = context;
  const url = new URL(request.url);

  // Pagination
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 24,
  });

  // Sorting
  const sortParam = url.searchParams.get('sort');
  const sortOption = SORT_OPTIONS.find((opt) =>
    `${opt.key}-${opt.reverse}` === sortParam
  ) || SORT_OPTIONS[0];

  // Filters from URL
  const filters = parseFiltersFromUrl(url.searchParams);

  const { collection } = await storefront.query(COLLECTION_QUERY, {
    variables: {
      handle,
      ...paginationVariables,
      filters,
      sortKey: sortOption.key,
      reverse: sortOption.reverse,
      country: context.storefront.i18n.country,
      language: context.storefront.i18n.language,
    },
  });

  if (!collection) {
    throw new Response('Collection not found', { status: 404 });
  }

  return json({
    collection,
    sortOptions: SORT_OPTIONS,
    currentSort: sortParam || `${SORT_OPTIONS[0].key}-${SORT_OPTIONS[0].reverse}`,
  });
}

// Parse filter URL params into Storefront API format
function parseFiltersFromUrl(searchParams: URLSearchParams): ProductFilter[] {
  const filters: ProductFilter[] = [];

  // Price range
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  if (minPrice || maxPrice) {
    filters.push({
      price: {
        min: minPrice ? parseFloat(minPrice) : undefined,
        max: maxPrice ? parseFloat(maxPrice) : undefined,
      },
    });
  }

  // Availability
  const availability = searchParams.get('availability');
  if (availability === 'true') {
    filters.push({ available: true });
  }

  // Product type
  const productType = searchParams.get('productType');
  if (productType) {
    filters.push({ productType });
  }

  // Vendor
  const vendor = searchParams.get('vendor');
  if (vendor) {
    filters.push({ productVendor: vendor });
  }

  // Variant options (color, size, etc.)
  searchParams.forEach((value, key) => {
    if (key.startsWith('option.')) {
      const optionName = key.replace('option.', '');
      filters.push({
        variantOption: {
          name: optionName,
          value,
        },
      });
    }
  });

  // Tags
  const tags = searchParams.getAll('tag');
  tags.forEach((tag) => {
    filters.push({ tag });
  });

  return filters;
}

export default function CollectionPage() {
  const { collection, sortOptions, currentSort } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Handle filter change
  const handleFilterChange = (filterKey: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);

    if (value === null) {
      newParams.delete(filterKey);
    } else {
      newParams.set(filterKey, value);
    }

    // Reset to first page when filtering
    newParams.delete('cursor');
    newParams.delete('direction');

    navigate(`?${newParams.toString()}`);
  };

  // Handle sort change
  const handleSortChange = (sortValue: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', sortValue);
    newParams.delete('cursor');
    newParams.delete('direction');
    navigate(`?${newParams.toString()}`);
  };

  // Clear all filters
  const clearFilters = () => {
    const newParams = new URLSearchParams();
    if (currentSort !== `${sortOptions[0].key}-${sortOptions[0].reverse}`) {
      newParams.set('sort', currentSort);
    }
    navigate(`?${newParams.toString()}`);
  };

  // Check if any filters are active
  const hasActiveFilters = Array.from(searchParams.keys()).some(
    (key) => key !== 'sort' && key !== 'cursor' && key !== 'direction'
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Analytics */}
      <Analytics.CollectionView
        data={{
          collection: {
            id: collection.id,
            handle: collection.handle,
          },
        }}
      />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{collection.title}</h1>
        {collection.description && (
          <p className="mt-2 text-gray-600">{collection.description}</p>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {collection.products.nodes.length} products
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>

        <SortDropdown
          options={sortOptions}
          currentValue={currentSort}
          onChange={handleSortChange}
        />
      </div>

      {/* Main content */}
      <div className="flex gap-8">
        {/* Sidebar filters */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <CollectionFilters
            filters={collection.products.filters}
            activeFilters={Object.fromEntries(searchParams)}
            onFilterChange={handleFilterChange}
          />
        </aside>

        {/* Product grid */}
        <main className="flex-1">
          {collection.products.nodes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No products match your filters</p>
              <button
                onClick={clearFilters}
                className="text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <ProductGrid products={collection.products.nodes} />

              {/* Pagination */}
              <Pagination pageInfo={collection.products.pageInfo} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
```

### 7.2 Filter Components

```tsx
// components/CollectionFilters.tsx
// Sidebar filter components

import { useState } from 'react';
import { Disclosure } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface Filter {
  id: string;
  label: string;
  type: string;
  values: FilterValue[];
}

interface FilterValue {
  id: string;
  label: string;
  count: number;
  input: string;
}

interface CollectionFiltersProps {
  filters: Filter[];
  activeFilters: Record<string, string>;
  onFilterChange: (key: string, value: string | null) => void;
}

export function CollectionFilters({
  filters,
  activeFilters,
  onFilterChange,
}: CollectionFiltersProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Filters</h2>

      {/* Price range filter */}
      <PriceRangeFilter
        minPrice={activeFilters.minPrice}
        maxPrice={activeFilters.maxPrice}
        onApply={(min, max) => {
          onFilterChange('minPrice', min || null);
          onFilterChange('maxPrice', max || null);
        }}
      />

      {/* Availability filter */}
      <Disclosure defaultOpen>
        {({ open }) => (
          <>
            <Disclosure.Button className="flex justify-between w-full py-2 text-left font-medium">
              Availability
              <ChevronDownIcon
                className={`w-5 h-5 transition ${open ? 'rotate-180' : ''}`}
              />
            </Disclosure.Button>
            <Disclosure.Panel className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeFilters.availability === 'true'}
                  onChange={(e) =>
                    onFilterChange('availability', e.target.checked ? 'true' : null)
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm">In stock only</span>
              </label>
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>

      {/* Dynamic filters from API */}
      {filters.map((filter) => (
        <FilterGroup
          key={filter.id}
          filter={filter}
          activeValue={activeFilters[`option.${filter.label}`]}
          onChange={(value) =>
            onFilterChange(`option.${filter.label}`, value)
          }
        />
      ))}
    </div>
  );
}

// Filter group component
function FilterGroup({
  filter,
  activeValue,
  onChange,
}: {
  filter: Filter;
  activeValue?: string;
  onChange: (value: string | null) => void;
}) {
  return (
    <Disclosure defaultOpen={!!activeValue}>
      {({ open }) => (
        <>
          <Disclosure.Button className="flex justify-between w-full py-2 text-left font-medium border-t pt-4">
            {filter.label}
            <ChevronDownIcon
              className={`w-5 h-5 transition ${open ? 'rotate-180' : ''}`}
            />
          </Disclosure.Button>
          <Disclosure.Panel className="pt-2 space-y-2">
            {filter.values.map((value) => {
              // Parse the input JSON
              const input = JSON.parse(value.input);
              const filterValue = input.variantOption?.value || input.productVendor || input.productType;

              return (
                <label
                  key={value.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name={filter.id}
                    checked={activeValue === filterValue}
                    onChange={() =>
                      onChange(activeValue === filterValue ? null : filterValue)
                    }
                    className="rounded-full border-gray-300"
                  />
                  <span className="text-sm">{value.label}</span>
                  <span className="text-xs text-gray-400">({value.count})</span>
                </label>
              );
            })}
            {activeValue && (
              <button
                onClick={() => onChange(null)}
                className="text-xs text-blue-600 hover:underline mt-2"
              >
                Clear
              </button>
            )}
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}

// Price range filter
function PriceRangeFilter({
  minPrice,
  maxPrice,
  onApply,
}: {
  minPrice?: string;
  maxPrice?: string;
  onApply: (min: string | null, max: string | null) => void;
}) {
  const [min, setMin] = useState(minPrice || '');
  const [max, setMax] = useState(maxPrice || '');

  const handleApply = () => {
    onApply(min || null, max || null);
  };

  return (
    <Disclosure defaultOpen={!!(minPrice || maxPrice)}>
      {({ open }) => (
        <>
          <Disclosure.Button className="flex justify-between w-full py-2 text-left font-medium border-t pt-4">
            Price
            <ChevronDownIcon
              className={`w-5 h-5 transition ${open ? 'rotate-180' : ''}`}
            />
          </Disclosure.Button>
          <Disclosure.Panel className="pt-2">
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="Min"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                className="w-20 border rounded px-2 py-1 text-sm"
              />
              <span>-</span>
              <input
                type="number"
                placeholder="Max"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                className="w-20 border rounded px-2 py-1 text-sm"
              />
              <button
                onClick={handleApply}
                className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
              >
                Go
              </button>
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}
```

### 7.3 Search Implementation

```tsx
// app/routes/search.tsx
// Search results page

import { json, type LoaderFunctionArgs } from '@shopify/remix-oxygen';
import { useLoaderData, useSearchParams, Form } from '@remix-run/react';
import { getPaginationVariables } from '@shopify/hydrogen';
import { ProductGrid } from '~/components/ProductGrid';
import { Pagination } from '~/components/Pagination';
import { SEARCH_QUERY } from '~/lib/queries';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';

  if (!query) {
    return json({
      searchTerm: '',
      results: null,
    });
  }

  const paginationVariables = getPaginationVariables(request, { pageBy: 24 });

  const { search } = await context.storefront.query(SEARCH_QUERY, {
    variables: {
      query,
      ...paginationVariables,
      types: ['PRODUCT'],
      country: context.storefront.i18n.country,
      language: context.storefront.i18n.language,
    },
  });

  return json({
    searchTerm: query,
    results: search,
  });
}

export default function SearchPage() {
  const { searchTerm, results } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Search form */}
      <Form method="get" className="max-w-xl mx-auto mb-8">
        <div className="relative">
          <input
            type="search"
            name="q"
            defaultValue={searchTerm}
            placeholder="Search products..."
            className="w-full border-2 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:border-black"
          />
          <button
            type="submit"
            className="absolute right-4 top-1/2 -translate-y-1/2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </Form>

      {/* Results */}
      {!searchTerm ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Enter a search term to find products</p>
        </div>
      ) : results?.totalCount === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">No results for "{searchTerm}"</h2>
          <p className="text-gray-500">Try adjusting your search</p>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-6">
            {results.totalCount} results for "{searchTerm}"
          </h1>

          <ProductGrid products={results.nodes.filter((n) => n.__typename === 'Product')} />

          <Pagination pageInfo={results.pageInfo} />
        </>
      )}
    </div>
  );
}
```

### 7.4 Predictive Search Component

```tsx
// components/PredictiveSearch.tsx
// Autocomplete search with instant results

import { useState, useEffect, useRef } from 'react';
import { useFetcher, Link } from '@remix-run/react';
import { Image, Money } from '@shopify/hydrogen';
import { useDebounce } from '~/hooks/useDebounce';

export function PredictiveSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const fetcher = useFetcher();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch results when query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      fetcher.load(`/api/predictive-search?q=${encodeURIComponent(debouncedQuery)}`);
    }
  }, [debouncedQuery]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = fetcher.data?.predictiveSearch;
  const hasResults = results?.products?.length ||
                     results?.collections?.length ||
                     results?.queries?.length;

  return (
    <div ref={containerRef} className="relative">
      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search..."
          className="w-full border rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-black"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {fetcher.state === 'loading' ? (
            <LoadingSpinner />
          ) : (
            <SearchIcon />
          )}
        </span>
      </div>

      {/* Results dropdown */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg max-h-[80vh] overflow-auto z-50">
          {!hasResults && fetcher.state !== 'loading' && (
            <div className="p-4 text-center text-gray-500">
              No results for "{query}"
            </div>
          )}

          {/* Search suggestions */}
          {results?.queries?.length > 0 && (
            <div className="p-4 border-b">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Suggestions
              </h3>
              <ul className="space-y-1">
                {results.queries.map((suggestion: { text: string; styledText: string }) => (
                  <li key={suggestion.text}>
                    <Link
                      to={`/search?q=${encodeURIComponent(suggestion.text)}`}
                      onClick={() => setIsOpen(false)}
                      className="block py-1 hover:text-blue-600"
                      dangerouslySetInnerHTML={{ __html: suggestion.styledText }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Products */}
          {results?.products?.length > 0 && (
            <div className="p-4 border-b">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Products
              </h3>
              <ul className="space-y-3">
                {results.products.slice(0, 5).map((product: any) => (
                  <li key={product.id}>
                    <Link
                      to={`/products/${product.handle}`}
                      onClick={() => setIsOpen(false)}
                      className="flex gap-3 hover:bg-gray-50 rounded p-1"
                    >
                      {product.featuredImage && (
                        <Image
                          src={product.featuredImage.url}
                          alt={product.featuredImage.altText || product.title}
                          width={50}
                          height={50}
                          className="rounded"
                        />
                      )}
                      <div>
                        <p className="font-medium text-sm">{product.title}</p>
                        <Money
                          data={product.priceRange.minVariantPrice}
                          className="text-sm text-gray-600"
                        />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Collections */}
          {results?.collections?.length > 0 && (
            <div className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Collections
              </h3>
              <ul className="space-y-2">
                {results.collections.map((collection: any) => (
                  <li key={collection.id}>
                    <Link
                      to={`/collections/${collection.handle}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 hover:bg-gray-50 rounded p-1"
                    >
                      {collection.image && (
                        <Image
                          src={collection.image.url}
                          alt={collection.image.altText || collection.title}
                          width={40}
                          height={40}
                          className="rounded"
                        />
                      )}
                      <span className="font-medium text-sm">{collection.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* View all results */}
          {hasResults && (
            <Link
              to={`/search?q=${encodeURIComponent(query)}`}
              onClick={() => setIsOpen(false)}
              className="block p-4 text-center text-blue-600 hover:bg-gray-50 font-medium"
            >
              View all results →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
```

---

## PART 8: INTERNATIONALIZATION & MULTI-CURRENCY

### 8.1 i18n Configuration

```typescript
// lib/i18n.ts
// Internationalization configuration and utilities

import type { I18nLocale } from '@shopify/hydrogen';

// Supported locales
export const SUPPORTED_LOCALES: I18nLocale[] = [
  { language: 'EN', country: 'US', currency: 'USD', label: 'United States (USD)' },
  { language: 'EN', country: 'GB', currency: 'GBP', label: 'United Kingdom (GBP)' },
  { language: 'EN', country: 'CA', currency: 'CAD', label: 'Canada (CAD)' },
  { language: 'EN', country: 'AU', currency: 'AUD', label: 'Australia (AUD)' },
  { language: 'FR', country: 'FR', currency: 'EUR', label: 'France (EUR)' },
  { language: 'DE', country: 'DE', currency: 'EUR', label: 'Germany (EUR)' },
  { language: 'ES', country: 'ES', currency: 'EUR', label: 'Spain (EUR)' },
  { language: 'JA', country: 'JP', currency: 'JPY', label: 'Japan (JPY)' },
  { language: 'EN', country: 'AE', currency: 'AED', label: 'UAE (AED)' },
];

// Default locale
export const DEFAULT_LOCALE: I18nLocale = SUPPORTED_LOCALES[0];

// Get locale from request
export function getLocaleFromRequest(request: Request): I18nLocale {
  const url = new URL(request.url);

  // Check URL path for locale prefix (e.g., /fr-fr/products)
  const pathParts = url.pathname.split('/').filter(Boolean);
  const localePrefix = pathParts[0]?.toLowerCase();

  if (localePrefix) {
    const [lang, country] = localePrefix.split('-');
    const matchedLocale = SUPPORTED_LOCALES.find(
      (l) => l.language.toLowerCase() === lang && l.country.toLowerCase() === country
    );
    if (matchedLocale) return matchedLocale;
  }

  // Check cookie for saved preference
  const cookieHeader = request.headers.get('Cookie');
  const localeCookie = cookieHeader
    ?.split(';')
    .find((c) => c.trim().startsWith('locale='))
    ?.split('=')[1];

  if (localeCookie) {
    const [lang, country] = localeCookie.split('-');
    const matchedLocale = SUPPORTED_LOCALES.find(
      (l) => l.language === lang && l.country === country
    );
    if (matchedLocale) return matchedLocale;
  }

  // Check Accept-Language header
  const acceptLanguage = request.headers.get('Accept-Language');
  if (acceptLanguage) {
    const preferredLanguage = acceptLanguage.split(',')[0]?.split('-')[0]?.toUpperCase();
    const matchedLocale = SUPPORTED_LOCALES.find(
      (l) => l.language === preferredLanguage
    );
    if (matchedLocale) return matchedLocale;
  }

  return DEFAULT_LOCALE;
}

// Build localized URL
export function getLocalizedUrl(
  path: string,
  locale: I18nLocale,
  currentLocale: I18nLocale
): string {
  // Remove current locale prefix if present
  const cleanPath = path.replace(
    new RegExp(`^/${currentLocale.language.toLowerCase()}-${currentLocale.country.toLowerCase()}`),
    ''
  );

  // Don't add prefix for default locale
  if (locale.country === DEFAULT_LOCALE.country && locale.language === DEFAULT_LOCALE.language) {
    return cleanPath || '/';
  }

  // Add new locale prefix
  const prefix = `/${locale.language.toLowerCase()}-${locale.country.toLowerCase()}`;
  return `${prefix}${cleanPath || '/'}`;
}

// Format money for locale
export function formatMoney(
  amount: number,
  currencyCode: string,
  locale?: string
): string {
  return new Intl.NumberFormat(locale || 'en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
}

// Translations
export const translations: Record<string, Record<string, string>> = {
  'EN': {
    'cart.title': 'Shopping Cart',
    'cart.empty': 'Your cart is empty',
    'cart.checkout': 'Proceed to Checkout',
    'cart.continue': 'Continue Shopping',
    'product.add_to_cart': 'Add to Cart',
    'product.sold_out': 'Sold Out',
    'product.buy_now': 'Buy Now',
    'search.placeholder': 'Search products...',
    'search.no_results': 'No results found',
    'account.login': 'Sign In',
    'account.register': 'Create Account',
    'account.logout': 'Sign Out',
  },
  'FR': {
    'cart.title': 'Panier',
    'cart.empty': 'Votre panier est vide',
    'cart.checkout': 'Passer la commande',
    'cart.continue': 'Continuer vos achats',
    'product.add_to_cart': 'Ajouter au panier',
    'product.sold_out': 'Épuisé',
    'product.buy_now': 'Acheter maintenant',
    'search.placeholder': 'Rechercher...',
    'search.no_results': 'Aucun résultat',
    'account.login': 'Se connecter',
    'account.register': 'Créer un compte',
    'account.logout': 'Déconnexion',
  },
  'DE': {
    'cart.title': 'Warenkorb',
    'cart.empty': 'Ihr Warenkorb ist leer',
    'cart.checkout': 'Zur Kasse',
    'cart.continue': 'Weiter einkaufen',
    'product.add_to_cart': 'In den Warenkorb',
    'product.sold_out': 'Ausverkauft',
    'product.buy_now': 'Jetzt kaufen',
    'search.placeholder': 'Suchen...',
    'search.no_results': 'Keine Ergebnisse',
    'account.login': 'Anmelden',
    'account.register': 'Konto erstellen',
    'account.logout': 'Abmelden',
  },
  'ES': {
    'cart.title': 'Carrito',
    'cart.empty': 'Tu carrito está vacío',
    'cart.checkout': 'Finalizar compra',
    'cart.continue': 'Seguir comprando',
    'product.add_to_cart': 'Añadir al carrito',
    'product.sold_out': 'Agotado',
    'product.buy_now': 'Comprar ahora',
    'search.placeholder': 'Buscar...',
    'search.no_results': 'Sin resultados',
    'account.login': 'Iniciar sesión',
    'account.register': 'Crear cuenta',
    'account.logout': 'Cerrar sesión',
  },
  'JA': {
    'cart.title': 'カート',
    'cart.empty': 'カートは空です',
    'cart.checkout': 'レジに進む',
    'cart.continue': '買い物を続ける',
    'product.add_to_cart': 'カートに追加',
    'product.sold_out': '売り切れ',
    'product.buy_now': '今すぐ購入',
    'search.placeholder': '検索...',
    'search.no_results': '結果なし',
    'account.login': 'ログイン',
    'account.register': 'アカウント作成',
    'account.logout': 'ログアウト',
  },
};

// Translation hook
export function useTranslation(locale: I18nLocale) {
  const t = (key: string): string => {
    return translations[locale.language]?.[key] || translations['EN'][key] || key;
  };

  return { t };
}
```

### 8.2 Locale Selector Component

```tsx
// components/LocaleSelector.tsx
// Country/language selector with currency display

import { useState, Fragment } from 'react';
import { useFetcher, useLocation } from '@remix-run/react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronDownIcon, CheckIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { SUPPORTED_LOCALES, getLocalizedUrl, type I18nLocale } from '~/lib/i18n';

interface LocaleSelectorProps {
  currentLocale: I18nLocale;
}

export function LocaleSelector({ currentLocale }: LocaleSelectorProps) {
  const fetcher = useFetcher();
  const location = useLocation();
  const [selected, setSelected] = useState(currentLocale);

  const handleChange = (locale: I18nLocale) => {
    setSelected(locale);

    // Save preference to cookie
    fetcher.submit(
      { locale: `${locale.language}-${locale.country}` },
      { method: 'POST', action: '/api/locale' }
    );

    // Redirect to localized URL
    const newUrl = getLocalizedUrl(location.pathname, locale, currentLocale);
    window.location.href = newUrl;
  };

  return (
    <Listbox value={selected} onChange={handleChange}>
      <div className="relative">
        <Listbox.Button className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50">
          <GlobeAltIcon className="w-5 h-5" />
          <span className="text-sm">{selected.country}</span>
          <span className="text-sm text-gray-500">({selected.currency})</span>
          <ChevronDownIcon className="w-4 h-4" />
        </Listbox.Button>

        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto z-50">
            {SUPPORTED_LOCALES.map((locale) => (
              <Listbox.Option
                key={`${locale.language}-${locale.country}`}
                value={locale}
                className={({ active }) =>
                  `flex items-center justify-between px-4 py-2 cursor-pointer ${
                    active ? 'bg-gray-50' : ''
                  }`
                }
              >
                {({ selected }) => (
                  <>
                    <span className={selected ? 'font-medium' : ''}>
                      {locale.label}
                    </span>
                    {selected && <CheckIcon className="w-5 h-5 text-black" />}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}

// Compact version for mobile
export function LocaleSelectorCompact({ currentLocale }: LocaleSelectorProps) {
  return (
    <select
      value={`${currentLocale.language}-${currentLocale.country}`}
      onChange={(e) => {
        const [lang, country] = e.target.value.split('-');
        const locale = SUPPORTED_LOCALES.find(
          (l) => l.language === lang && l.country === country
        );
        if (locale) {
          window.location.href = getLocalizedUrl(
            window.location.pathname,
            locale,
            currentLocale
          );
        }
      }}
      className="border rounded px-2 py-1 text-sm"
    >
      {SUPPORTED_LOCALES.map((locale) => (
        <option
          key={`${locale.language}-${locale.country}`}
          value={`${locale.language}-${locale.country}`}
        >
          {locale.country} ({locale.currency})
        </option>
      ))}
    </select>
  );
}
```

---

## PART 9: PERFORMANCE OPTIMIZATION

### 9.1 Caching Strategies

```typescript
// lib/cache.ts
// Caching configuration and utilities

import { CacheNone, CacheLong, CacheShort, CacheCustom } from '@shopify/hydrogen';

// Cache profiles for different content types
export const cacheProfiles = {
  // No caching - for dynamic, personalized content
  none: CacheNone(),

  // Short cache (1 minute) - for frequently changing content
  short: CacheShort(),

  // Long cache (1 hour) - for static content
  long: CacheLong(),

  // Product pages - balance between freshness and performance
  product: CacheCustom({
    mode: 'public',
    maxAge: 60,           // 1 minute
    staleWhileRevalidate: 300, // 5 minutes
  }),

  // Collection pages - slightly longer cache
  collection: CacheCustom({
    mode: 'public',
    maxAge: 120,          // 2 minutes
    staleWhileRevalidate: 600, // 10 minutes
  }),

  // Static pages (about, contact, etc.)
  staticPage: CacheCustom({
    mode: 'public',
    maxAge: 3600,         // 1 hour
    staleWhileRevalidate: 86400, // 24 hours
  }),

  // Cart - never cache
  cart: CacheNone(),

  // Account pages - never cache (personalized)
  account: CacheNone(),

  // API responses
  api: CacheCustom({
    mode: 'public',
    maxAge: 30,
    staleWhileRevalidate: 60,
  }),
};

// Apply cache headers to response
export function withCache(
  response: Response,
  profile: keyof typeof cacheProfiles
): Response {
  const cacheControl = cacheProfiles[profile];

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers),
      'Cache-Control': cacheControl.toString(),
    },
  });
}

// Generate cache key for queries
export function generateCacheKey(
  query: string,
  variables: Record<string, unknown>
): string {
  const variableString = JSON.stringify(variables, Object.keys(variables).sort());
  return `${query.slice(0, 50)}:${variableString}`;
}
```

### 9.2 Image Optimization

```tsx
// components/OptimizedImage.tsx
// Optimized image component with lazy loading and responsive sizes

import { Image } from '@shopify/hydrogen';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
  sizes?: string;
  aspectRatio?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  sizes = '100vw',
  aspectRatio,
}: OptimizedImageProps) {
  // Generate srcset for responsive images
  const widths = [320, 640, 960, 1280, 1600, 1920];

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      className={className}
      sizes={sizes}
      style={aspectRatio ? { aspectRatio } : undefined}
      loaderOptions={{
        // Shopify CDN image transformations
        scale: 2, // Retina support
        crop: 'center',
      }}
    />
  );
}

// Product image with hover effect
export function ProductImage({
  src,
  hoverSrc,
  alt,
  className = '',
}: {
  src: string;
  hoverSrc?: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={600}
        height={600}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          hoverSrc ? 'group-hover:opacity-0' : ''
        }`}
        loading="lazy"
      />
      {hoverSrc && (
        <Image
          src={hoverSrc}
          alt={`${alt} - alternate view`}
          width={600}
          height={600}
          className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          loading="lazy"
        />
      )}
    </div>
  );
}

// Background image with lazy loading
export function BackgroundImage({
  src,
  children,
  className = '',
  overlay = false,
}: {
  src: string;
  children: React.ReactNode;
  className?: string;
  overlay?: boolean;
}) {
  return (
    <div
      className={`relative bg-cover bg-center ${className}`}
      style={{
        backgroundImage: `url(${src})`,
      }}
    >
      {overlay && (
        <div className="absolute inset-0 bg-black/40" />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
```

### 9.3 Code Splitting and Lazy Loading

```tsx
// lib/lazy.ts
// Lazy loading utilities

import { lazy, Suspense, type ComponentType } from 'react';

// Lazy load component with loading fallback
export function lazyLoad<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback: React.ReactNode = <LoadingSpinner />
) {
  const LazyComponent = lazy(importFn);

  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Loading spinner
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
    </div>
  );
}

// Lazy load below-the-fold components
export const LazyProductRecommendations = lazyLoad(
  () => import('~/components/ProductRecommendations')
);

export const LazyReviews = lazyLoad(
  () => import('~/components/ProductReviews')
);

export const LazyInstagramFeed = lazyLoad(
  () => import('~/components/InstagramFeed')
);

export const LazyNewsletterForm = lazyLoad(
  () => import('~/components/NewsletterForm')
);

// Intersection observer for lazy loading
export function useLazyLoad(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

// Lazy section wrapper
export function LazySection({
  children,
  fallback = <SectionSkeleton />,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { ref, isVisible } = useLazyLoad();

  return (
    <div ref={ref}>
      {isVisible ? children : fallback}
    </div>
  );
}

// Section skeleton
function SectionSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="aspect-square bg-gray-200 rounded" />
        ))}
      </div>
    </div>
  );
}
```

### 9.4 Performance Monitoring

```typescript
// lib/performance.ts
// Performance monitoring and analytics

// Web Vitals tracking
export function trackWebVitals() {
  if (typeof window === 'undefined') return;

  // Track Core Web Vitals
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(sendToAnalytics);
    getFID(sendToAnalytics);
    getFCP(sendToAnalytics);
    getLCP(sendToAnalytics);
    getTTFB(sendToAnalytics);
  });
}

function sendToAnalytics(metric: { name: string; value: number; id: string }) {
  // Send to your analytics service
  console.log(`[Web Vital] ${metric.name}: ${metric.value}`);

  // Example: Send to Google Analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  }
}

// Performance marks for custom tracking
export function markPerformance(name: string) {
  if (typeof performance !== 'undefined') {
    performance.mark(name);
  }
}

export function measurePerformance(name: string, startMark: string, endMark: string) {
  if (typeof performance !== 'undefined') {
    performance.measure(name, startMark, endMark);
    const entries = performance.getEntriesByName(name, 'measure');
    if (entries.length > 0) {
      console.log(`[Performance] ${name}: ${entries[0].duration.toFixed(2)}ms`);
    }
  }
}

// Resource timing analysis
export function analyzeResourceTiming() {
  if (typeof performance === 'undefined') return;

  const resources = performance.getEntriesByType('resource');

  const analysis = {
    total: resources.length,
    byType: {} as Record<string, { count: number; totalSize: number; totalTime: number }>,
    slowest: [] as Array<{ name: string; duration: number }>,
  };

  resources.forEach((resource: PerformanceResourceTiming) => {
    const type = resource.initiatorType;
    if (!analysis.byType[type]) {
      analysis.byType[type] = { count: 0, totalSize: 0, totalTime: 0 };
    }
    analysis.byType[type].count++;
    analysis.byType[type].totalSize += resource.transferSize || 0;
    analysis.byType[type].totalTime += resource.duration;
  });

  // Find slowest resources
  analysis.slowest = resources
    .map((r) => ({ name: r.name, duration: r.duration }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10);

  return analysis;
}
```

---

## PART 10: DEPLOYMENT & OXYGEN EDGE NETWORK

### 10.1 Oxygen Deployment Configuration

```toml
# shopify.hydrogen.toml
# Full Hydrogen/Oxygen configuration

[shopify]
storeId = "your-store-id"
storefrontApiVersion = "2024-01"

# Production environment
[environments.production]
name = "Production"
branch = "main"
env = { show = [
  "PUBLIC_STOREFRONT_API_TOKEN",
  "PUBLIC_STORE_DOMAIN",
  "SESSION_SECRET"
]}

[environments.production.build]
command = "npm run build"
output = "dist/worker"

# Staging environment
[environments.staging]
name = "Staging"
branch = "staging"
env = { show = [
  "PUBLIC_STOREFRONT_API_TOKEN",
  "PUBLIC_STORE_DOMAIN",
  "SESSION_SECRET"
]}

# Preview environments (for PRs)
[environments.preview]
name = "Preview"
branch = "*"
type = "preview"

# Custom domains
[environments.production.domains]
primary = "store.yourdomain.com"
redirects = ["www.yourdomain.com"]
```

### 10.2 Deployment Scripts

```json
// package.json - scripts section
{
  "scripts": {
    "dev": "shopify hydrogen dev --codegen",
    "build": "shopify hydrogen build --codegen",
    "preview": "shopify hydrogen preview",
    "deploy": "shopify hydrogen deploy",
    "deploy:staging": "shopify hydrogen deploy --env staging",
    "deploy:production": "shopify hydrogen deploy --env production",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write .",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "codegen": "shopify hydrogen codegen",
    "analyze": "shopify hydrogen build --analyze"
  }
}
```

### 10.3 CI/CD with GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy Hydrogen Store

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

env:
  SHOPIFY_CLI_PARTNERS_TOKEN: ${{ secrets.SHOPIFY_CLI_PARTNERS_TOKEN }}
  SHOPIFY_HYDROGEN_FLAG_STOREFRONT_ID: ${{ secrets.STOREFRONT_ID }}

jobs:
  lint-test:
    name: Lint & Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run TypeScript check
        run: npm run typecheck

      - name: Run ESLint
        run: npm run lint

      - name: Run tests
        run: npm run test

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: lint-test
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/

  deploy-preview:
    name: Deploy Preview
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build
          path: dist/

      - name: Install Shopify CLI
        run: npm install -g @shopify/cli @shopify/hydrogen

      - name: Deploy to preview
        run: shopify hydrogen deploy --env preview
        env:
          SHOPIFY_FLAG_STORE: ${{ secrets.SHOPIFY_STORE }}

      - name: Comment preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview deployed! Check it out at: ${{ steps.deploy.outputs.url }}'
            })

  deploy-staging:
    name: Deploy Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/staging'
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build
          path: dist/

      - name: Install Shopify CLI
        run: npm install -g @shopify/cli @shopify/hydrogen

      - name: Deploy to staging
        run: shopify hydrogen deploy --env staging
        env:
          SHOPIFY_FLAG_STORE: ${{ secrets.SHOPIFY_STORE }}

  deploy-production:
    name: Deploy Production
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build
          path: dist/

      - name: Install Shopify CLI
        run: npm install -g @shopify/cli @shopify/hydrogen

      - name: Deploy to production
        run: shopify hydrogen deploy --env production
        env:
          SHOPIFY_FLAG_STORE: ${{ secrets.SHOPIFY_STORE }}
```

### 10.4 Alternative Deployment to Vercel

```typescript
// vercel.json
// Vercel deployment configuration
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/client",
  "framework": null,
  "functions": {
    "api/**/*.ts": {
      "runtime": "edge"
    }
  },
  "routes": [
    {
      "src": "/assets/(.*)",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    },
    {
      "src": "/(.*)",
      "dest": "/api/server.ts"
    }
  ],
  "env": {
    "PUBLIC_STORE_DOMAIN": "@shopify-store-domain",
    "PUBLIC_STOREFRONT_API_TOKEN": "@shopify-storefront-token",
    "PRIVATE_STOREFRONT_API_TOKEN": "@shopify-private-token",
    "SESSION_SECRET": "@session-secret"
  }
}
```

```typescript
// api/server.ts
// Vercel edge function entry point

import { createRequestHandler } from '@shopify/remix-oxygen';
import { createStorefrontClient, createCustomerAccountClient } from '@shopify/hydrogen';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const env = {
    PUBLIC_STORE_DOMAIN: process.env.PUBLIC_STORE_DOMAIN!,
    PUBLIC_STOREFRONT_API_TOKEN: process.env.PUBLIC_STOREFRONT_API_TOKEN!,
    PRIVATE_STOREFRONT_API_TOKEN: process.env.PRIVATE_STOREFRONT_API_TOKEN!,
    SESSION_SECRET: process.env.SESSION_SECRET!,
  };

  const { storefront } = createStorefrontClient({
    storeDomain: env.PUBLIC_STORE_DOMAIN,
    publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
    privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
    storefrontApiVersion: '2024-01',
  });

  const handleRequest = createRequestHandler({
    build: await import('../dist/server'),
    mode: process.env.NODE_ENV,
    getLoadContext: () => ({
      env,
      storefront,
    }),
  });

  return handleRequest(request);
}
```

---

## PART 11: ALTERNATIVE HEADLESS SOLUTIONS

### 11.1 Medusa.js (Open Source)

```typescript
// medusa-config.js
// Medusa.js configuration

module.exports = {
  projectConfig: {
    redis_url: process.env.REDIS_URL,
    database_url: process.env.DATABASE_URL,
    database_type: 'postgres',
    store_cors: process.env.STORE_CORS,
    admin_cors: process.env.ADMIN_CORS,
  },
  plugins: [
    // File storage
    {
      resolve: '@medusajs/file-local',
      options: {
        upload_dir: 'uploads',
      },
    },
    // Search
    {
      resolve: '@medusajs/medusa-plugin-meilisearch',
      options: {
        host: process.env.MEILISEARCH_HOST,
        apiKey: process.env.MEILISEARCH_API_KEY,
      },
    },
    // Stripe payments
    {
      resolve: 'medusa-payment-stripe',
      options: {
        api_key: process.env.STRIPE_API_KEY,
      },
    },
    // Notifications
    {
      resolve: 'medusa-plugin-sendgrid',
      options: {
        api_key: process.env.SENDGRID_API_KEY,
        from: process.env.SENDGRID_FROM,
      },
    },
  ],
};
```

### 11.2 Saleor (GraphQL-First)

```typescript
// saleor-client.ts
// Saleor GraphQL client setup

import { createClient, cacheExchange, fetchExchange } from 'urql';
import { authExchange } from '@urql/exchange-auth';

const SALEOR_API_URL = process.env.SALEOR_API_URL!;

// Create authenticated client
export const saleorClient = createClient({
  url: SALEOR_API_URL,
  exchanges: [
    cacheExchange,
    authExchange(async (utils) => {
      let token = getToken();
      let refreshToken = getRefreshToken();

      return {
        addAuthToOperation(operation) {
          if (!token) return operation;
          return utils.appendHeaders(operation, {
            Authorization: `Bearer ${token}`,
          });
        },
        didAuthError(error) {
          return error.graphQLErrors.some(
            (e) => e.extensions?.code === 'FORBIDDEN'
          );
        },
        async refreshAuth() {
          const result = await utils.mutate(REFRESH_TOKEN_MUTATION, {
            refreshToken,
          });
          if (result.data?.tokenRefresh?.token) {
            token = result.data.tokenRefresh.token;
            saveToken(token);
          }
        },
      };
    }),
    fetchExchange,
  ],
});

// Product query example
const PRODUCTS_QUERY = `
  query Products($first: Int!, $channel: String!) {
    products(first: $first, channel: $channel) {
      edges {
        node {
          id
          name
          slug
          description
          pricing {
            priceRange {
              start {
                gross {
                  amount
                  currency
                }
              }
            }
          }
          thumbnail {
            url
            alt
          }
        }
      }
    }
  }
`;
```

### 11.3 commercetools (Enterprise)

```typescript
// commercetools-client.ts
// commercetools SDK setup

import {
  ClientBuilder,
  type AuthMiddlewareOptions,
  type HttpMiddlewareOptions,
} from '@commercetools/sdk-client-v2';
import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';

const projectKey = process.env.CTP_PROJECT_KEY!;
const clientId = process.env.CTP_CLIENT_ID!;
const clientSecret = process.env.CTP_CLIENT_SECRET!;
const authUrl = process.env.CTP_AUTH_URL!;
const apiUrl = process.env.CTP_API_URL!;
const scopes = process.env.CTP_SCOPES!.split(' ');

// Auth middleware options
const authMiddlewareOptions: AuthMiddlewareOptions = {
  host: authUrl,
  projectKey,
  credentials: { clientId, clientSecret },
  scopes,
};

// HTTP middleware options
const httpMiddlewareOptions: HttpMiddlewareOptions = {
  host: apiUrl,
};

// Create client
const ctpClient = new ClientBuilder()
  .withClientCredentialsFlow(authMiddlewareOptions)
  .withHttpMiddleware(httpMiddlewareOptions)
  .build();

// Create API root
export const apiRoot = createApiBuilderFromCtpClient(ctpClient)
  .withProjectKey({ projectKey });

// Usage examples
export async function getProducts(limit = 20) {
  const response = await apiRoot
    .products()
    .get({
      queryArgs: { limit },
    })
    .execute();

  return response.body.results;
}

export async function getProductBySlug(slug: string, locale: string) {
  const response = await apiRoot
    .productProjections()
    .search()
    .get({
      queryArgs: {
        [`filter.query`]: `slug.${locale}:"${slug}"`,
        limit: 1,
      },
    })
    .execute();

  return response.body.results[0];
}
```

### 11.4 Comparison Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HEADLESS COMMERCE PLATFORM COMPARISON                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PLATFORM          │ TYPE        │ PRICING          │ BEST FOR              │
│  ──────────────────┼─────────────┼──────────────────┼───────────────────────│
│  Shopify Hydrogen  │ SaaS        │ Shopify Plus     │ Existing Shopify      │
│                    │             │ ($2,000+/mo)     │ merchants             │
│  ──────────────────┼─────────────┼──────────────────┼───────────────────────│
│  Medusa.js         │ Open Source │ Free + Hosting   │ Developers wanting    │
│                    │             │                  │ full control          │
│  ──────────────────┼─────────────┼──────────────────┼───────────────────────│
│  Saleor            │ Open Source │ Free + Cloud     │ GraphQL-first teams   │
│                    │             │ ($199+/mo)       │                       │
│  ──────────────────┼─────────────┼──────────────────┼───────────────────────│
│  commercetools     │ SaaS        │ Enterprise       │ Large enterprises     │
│                    │             │ (Custom)         │                       │
│  ──────────────────┼─────────────┼──────────────────┼───────────────────────│
│  BigCommerce       │ SaaS        │ $79-$399/mo      │ Multi-channel         │
│                    │             │                  │ sellers               │
│  ──────────────────┼─────────────┼──────────────────┼───────────────────────│
│  Elastic Path      │ SaaS        │ Enterprise       │ Complex catalogs      │
│                    │             │ (Custom)         │                       │
│                                                                              │
│  FEATURE COMPARISON:                                                         │
│  ┌───────────────┬───────┬────────┬────────┬─────────────┬───────────────┐ │
│  │ Feature       │Shopify│ Medusa │ Saleor │commercetools│  BigCommerce  │ │
│  ├───────────────┼───────┼────────┼────────┼─────────────┼───────────────┤ │
│  │ API Type      │GraphQL│ REST   │GraphQL │ REST/GQL    │ REST/GQL      │ │
│  │ Self-Hosted   │ No    │ Yes    │ Yes    │ No          │ No            │ │
│  │ Multi-store   │ Yes   │ Yes    │ Yes    │ Yes         │ Yes           │ │
│  │ B2B Support   │ Yes   │ Limited│ Yes    │ Yes         │ Yes           │ │
│  │ Subscriptions │ Apps  │ Plugin │ Yes    │ Yes         │ Limited       │ │
│  │ Marketplace   │ Apps  │ Custom │ Yes    │ Yes         │ No            │ │
│  │ Edge Deploy   │Oxygen │ Custom │ Custom │ Custom      │ Custom        │ │
│  └───────────────┴───────┴────────┴────────┴─────────────┴───────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PART 12: ENTERPRISE PATTERNS & SCALING

### 12.1 Multi-Store Architecture

```typescript
// lib/multi-store.ts
// Multi-store configuration and routing

interface StoreConfig {
  id: string;
  name: string;
  domain: string;
  locale: I18nLocale;
  storefrontToken: string;
  features: {
    b2b: boolean;
    subscriptions: boolean;
    loyalty: boolean;
  };
}

// Store configurations
const stores: Record<string, StoreConfig> = {
  'us': {
    id: 'store-us',
    name: 'US Store',
    domain: 'us.example.com',
    locale: { language: 'EN', country: 'US', currency: 'USD' },
    storefrontToken: process.env.US_STOREFRONT_TOKEN!,
    features: { b2b: false, subscriptions: true, loyalty: true },
  },
  'eu': {
    id: 'store-eu',
    name: 'EU Store',
    domain: 'eu.example.com',
    locale: { language: 'EN', country: 'DE', currency: 'EUR' },
    storefrontToken: process.env.EU_STOREFRONT_TOKEN!,
    features: { b2b: true, subscriptions: true, loyalty: false },
  },
  'apac': {
    id: 'store-apac',
    name: 'APAC Store',
    domain: 'apac.example.com',
    locale: { language: 'EN', country: 'AU', currency: 'AUD' },
    storefrontToken: process.env.APAC_STOREFRONT_TOKEN!,
    features: { b2b: false, subscriptions: false, loyalty: true },
  },
};

// Get store from request
export function getStoreFromRequest(request: Request): StoreConfig {
  const url = new URL(request.url);
  const hostname = url.hostname;

  // Find matching store
  const store = Object.values(stores).find(s =>
    s.domain === hostname || hostname.endsWith(`.${s.domain}`)
  );

  return store || stores['us']; // Default to US store
}

// Create store-specific storefront client
export function createStoreClient(store: StoreConfig) {
  return createStorefrontClient({
    storeDomain: `${store.id}.myshopify.com`,
    publicStorefrontToken: store.storefrontToken,
    storefrontApiVersion: '2024-01',
    i18n: {
      defaultLocale: store.locale,
      locales: [store.locale],
    },
  });
}
```

### 12.2 B2B Commerce Features

```typescript
// lib/b2b.ts
// B2B commerce functionality

interface Company {
  id: string;
  name: string;
  paymentTerms: 'NET_30' | 'NET_60' | 'NET_90' | 'PREPAID';
  creditLimit: number;
  priceListId: string;
  contacts: CompanyContact[];
}

interface CompanyContact {
  id: string;
  email: string;
  role: 'ADMIN' | 'BUYER' | 'APPROVER';
  spendingLimit?: number;
  requiresApproval: boolean;
}

// B2B Price List Query
const B2B_PRICE_LIST_QUERY = `#graphql
  query B2BPriceList($companyLocationId: ID!, $productIds: [ID!]!) {
    companyLocation(id: $companyLocationId) {
      id
      catalog {
        priceList {
          prices(productIds: $productIds) {
            nodes {
              product {
                id
              }
              price {
                amount
                currencyCode
              }
              compareAtPrice {
                amount
                currencyCode
              }
              quantityPriceBreaks {
                minimumQuantity
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  }
`;

// Quick order form (bulk ordering)
export function QuickOrderForm({ onSubmit }: { onSubmit: (items: OrderItem[]) => void }) {
  const [items, setItems] = useState<Array<{ sku: string; quantity: number }>>([
    { sku: '', quantity: 1 },
  ]);

  const addRow = () => {
    setItems([...items, { sku: '', quantity: 1 }]);
  };

  const updateRow = (index: number, field: 'sku' | 'quantity', value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Quick Order</h2>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-4 items-center">
            <input
              type="text"
              placeholder="SKU"
              value={item.sku}
              onChange={(e) => updateRow(index, 'sku', e.target.value)}
              className="flex-1 border rounded px-3 py-2"
            />
            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => updateRow(index, 'quantity', parseInt(e.target.value))}
              className="w-24 border rounded px-3 py-2"
            />
            <button
              onClick={() => removeRow(index)}
              className="text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <button
          onClick={addRow}
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          Add Row
        </button>
        <button
          onClick={() => onSubmit(items.filter(i => i.sku))}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
        >
          Add to Cart
        </button>
      </div>

      {/* CSV Upload */}
      <div className="mt-6 pt-6 border-t">
        <h3 className="font-medium mb-2">Upload CSV</h3>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => handleCSVUpload(e, setItems)}
          className="text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Format: SKU,Quantity (one per line)
        </p>
      </div>
    </div>
  );
}

async function handleCSVUpload(
  event: React.ChangeEvent<HTMLInputElement>,
  setItems: (items: Array<{ sku: string; quantity: number }>) => void
) {
  const file = event.target.files?.[0];
  if (!file) return;

  const text = await file.text();
  const lines = text.split('\n').filter(Boolean);
  const items = lines.map((line) => {
    const [sku, quantity] = line.split(',');
    return { sku: sku.trim(), quantity: parseInt(quantity) || 1 };
  });

  setItems(items);
}
```

### 12.3 Subscription Commerce

```typescript
// lib/subscriptions.ts
// Subscription commerce functionality

interface SubscriptionPlan {
  id: string;
  name: string;
  interval: 'WEEK' | 'MONTH' | 'YEAR';
  intervalCount: number;
  discount: number; // Percentage
  minCycles?: number;
  maxCycles?: number;
}

// Subscription plans
const subscriptionPlans: SubscriptionPlan[] = [
  { id: 'weekly', name: 'Weekly', interval: 'WEEK', intervalCount: 1, discount: 5 },
  { id: 'biweekly', name: 'Every 2 Weeks', interval: 'WEEK', intervalCount: 2, discount: 10 },
  { id: 'monthly', name: 'Monthly', interval: 'MONTH', intervalCount: 1, discount: 15 },
  { id: 'bimonthly', name: 'Every 2 Months', interval: 'MONTH', intervalCount: 2, discount: 10 },
];

// Subscription selector component
export function SubscriptionSelector({
  productId,
  variantId,
  regularPrice,
  onSelect,
}: {
  productId: string;
  variantId: string;
  regularPrice: number;
  onSelect: (plan: SubscriptionPlan | null) => void;
}) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isSubscription, setIsSubscription] = useState(false);

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    onSelect(plan);
  };

  return (
    <div className="space-y-4">
      {/* One-time vs Subscription toggle */}
      <div className="flex gap-4">
        <button
          onClick={() => {
            setIsSubscription(false);
            onSelect(null);
          }}
          className={`flex-1 p-4 border rounded-lg ${
            !isSubscription ? 'border-black bg-gray-50' : 'border-gray-200'
          }`}
        >
          <div className="font-medium">One-time purchase</div>
          <div className="text-lg font-bold">${regularPrice.toFixed(2)}</div>
        </button>

        <button
          onClick={() => setIsSubscription(true)}
          className={`flex-1 p-4 border rounded-lg ${
            isSubscription ? 'border-black bg-gray-50' : 'border-gray-200'
          }`}
        >
          <div className="font-medium">Subscribe & Save</div>
          <div className="text-lg font-bold text-green-600">
            Up to 15% off
          </div>
        </button>
      </div>

      {/* Subscription options */}
      {isSubscription && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">Delivery frequency</label>
          <div className="grid grid-cols-2 gap-2">
            {subscriptionPlans.map((plan) => {
              const discountedPrice = regularPrice * (1 - plan.discount / 100);

              return (
                <button
                  key={plan.id}
                  onClick={() => handlePlanSelect(plan)}
                  className={`p-3 border rounded-lg text-left ${
                    selectedPlan?.id === plan.id
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{plan.name}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold">
                      ${discountedPrice.toFixed(2)}
                    </span>
                    <span className="text-sm text-green-600">
                      Save {plan.discount}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 12.4 Analytics Integration

```typescript
// lib/analytics.ts
// Comprehensive analytics integration

import { Analytics } from '@shopify/hydrogen';

// Event types
type AnalyticsEvent =
  | { type: 'page_view'; data: { path: string; title: string } }
  | { type: 'product_view'; data: ProductViewData }
  | { type: 'add_to_cart'; data: AddToCartData }
  | { type: 'remove_from_cart'; data: RemoveFromCartData }
  | { type: 'begin_checkout'; data: CheckoutData }
  | { type: 'purchase'; data: PurchaseData }
  | { type: 'search'; data: SearchData };

interface ProductViewData {
  productId: string;
  productName: string;
  price: number;
  currency: string;
  category?: string;
  variant?: string;
}

interface AddToCartData {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  currency: string;
  variantId: string;
}

// Analytics tracker
class AnalyticsTracker {
  private providers: AnalyticsProvider[] = [];

  constructor() {
    // Initialize providers
    if (typeof window !== 'undefined') {
      this.providers = [
        new GoogleAnalyticsProvider(),
        new MetaPixelProvider(),
        new KlaviyoProvider(),
      ];
    }
  }

  track(event: AnalyticsEvent) {
    this.providers.forEach((provider) => {
      try {
        provider.track(event);
      } catch (error) {
        console.error(`Analytics error (${provider.name}):`, error);
      }
    });
  }

  identify(userId: string, traits?: Record<string, unknown>) {
    this.providers.forEach((provider) => {
      try {
        provider.identify?.(userId, traits);
      } catch (error) {
        console.error(`Analytics identify error (${provider.name}):`, error);
      }
    });
  }
}

// Provider interface
interface AnalyticsProvider {
  name: string;
  track(event: AnalyticsEvent): void;
  identify?(userId: string, traits?: Record<string, unknown>): void;
}

// Google Analytics 4 provider
class GoogleAnalyticsProvider implements AnalyticsProvider {
  name = 'Google Analytics';

  track(event: AnalyticsEvent) {
    if (typeof gtag === 'undefined') return;

    switch (event.type) {
      case 'page_view':
        gtag('event', 'page_view', {
          page_path: event.data.path,
          page_title: event.data.title,
        });
        break;

      case 'product_view':
        gtag('event', 'view_item', {
          items: [{
            item_id: event.data.productId,
            item_name: event.data.productName,
            price: event.data.price,
            currency: event.data.currency,
          }],
        });
        break;

      case 'add_to_cart':
        gtag('event', 'add_to_cart', {
          items: [{
            item_id: event.data.productId,
            item_name: event.data.productName,
            price: event.data.price,
            quantity: event.data.quantity,
            currency: event.data.currency,
          }],
        });
        break;

      case 'purchase':
        gtag('event', 'purchase', {
          transaction_id: event.data.orderId,
          value: event.data.total,
          currency: event.data.currency,
          items: event.data.items,
        });
        break;
    }
  }

  identify(userId: string) {
    if (typeof gtag === 'undefined') return;
    gtag('set', { user_id: userId });
  }
}

// Meta (Facebook) Pixel provider
class MetaPixelProvider implements AnalyticsProvider {
  name = 'Meta Pixel';

  track(event: AnalyticsEvent) {
    if (typeof fbq === 'undefined') return;

    switch (event.type) {
      case 'page_view':
        fbq('track', 'PageView');
        break;

      case 'product_view':
        fbq('track', 'ViewContent', {
          content_ids: [event.data.productId],
          content_name: event.data.productName,
          content_type: 'product',
          value: event.data.price,
          currency: event.data.currency,
        });
        break;

      case 'add_to_cart':
        fbq('track', 'AddToCart', {
          content_ids: [event.data.productId],
          content_name: event.data.productName,
          content_type: 'product',
          value: event.data.price * event.data.quantity,
          currency: event.data.currency,
        });
        break;

      case 'begin_checkout':
        fbq('track', 'InitiateCheckout', {
          content_ids: event.data.items.map((i) => i.productId),
          value: event.data.total,
          currency: event.data.currency,
          num_items: event.data.items.length,
        });
        break;

      case 'purchase':
        fbq('track', 'Purchase', {
          content_ids: event.data.items.map((i) => i.productId),
          value: event.data.total,
          currency: event.data.currency,
          num_items: event.data.items.length,
        });
        break;
    }
  }
}

// Export singleton
export const analytics = new AnalyticsTracker();

// React hook for analytics
export function useAnalytics() {
  return {
    trackPageView: (path: string, title: string) => {
      analytics.track({ type: 'page_view', data: { path, title } });
    },
    trackProductView: (data: ProductViewData) => {
      analytics.track({ type: 'product_view', data });
    },
    trackAddToCart: (data: AddToCartData) => {
      analytics.track({ type: 'add_to_cart', data });
    },
    trackPurchase: (data: PurchaseData) => {
      analytics.track({ type: 'purchase', data });
    },
    identify: (userId: string, traits?: Record<string, unknown>) => {
      analytics.identify(userId, traits);
    },
  };
}
```

---

## QUICK REFERENCE CARDS

### Hydrogen CLI Commands

```bash
# Project setup
npm create @shopify/hydrogen@latest    # Create new project
shopify hydrogen dev                    # Start dev server
shopify hydrogen build                  # Build for production
shopify hydrogen preview               # Preview production build
shopify hydrogen deploy                # Deploy to Oxygen

# Code generation
shopify hydrogen codegen               # Generate TypeScript types
shopify hydrogen link                  # Link to Shopify store
shopify hydrogen unlink                # Unlink from store

# Environment management
shopify hydrogen env list              # List environments
shopify hydrogen env pull              # Pull env variables
shopify hydrogen env push              # Push env variables

# Debugging
shopify hydrogen debug cpu             # CPU profiling
shopify hydrogen debug memory          # Memory profiling
```

### Storefront API Quick Reference

```graphql
# Essential queries
query Product($handle: String!) { product(handle: $handle) { ... } }
query Collection($handle: String!) { collection(handle: $handle) { ... } }
query Products($first: Int!) { products(first: $first) { ... } }
query Search($query: String!) { search(query: $query) { ... } }
query Customer($token: String!) { customer(customerAccessToken: $token) { ... } }
query Cart($id: ID!) { cart(id: $id) { ... } }

# Essential mutations
mutation CartCreate($input: CartInput!) { cartCreate(input: $input) { ... } }
mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) { ... }
mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) { ... }
mutation CustomerCreate($input: CustomerCreateInput!) { ... }
mutation CustomerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) { ... }
```

### Performance Checklist

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HEADLESS COMMERCE PERFORMANCE CHECKLIST                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  □ Use appropriate cache headers for each route                              │
│  □ Implement image optimization (responsive sizes, lazy loading)             │
│  □ Code split large components (lazy load below-the-fold)                   │
│  □ Prefetch critical data on hover/focus                                    │
│  □ Use streaming SSR for faster TTFB                                        │
│  □ Minimize GraphQL query complexity (avoid deeply nested queries)          │
│  □ Implement predictive prefetching for navigation                          │
│  □ Use edge caching (Oxygen, Vercel Edge, Cloudflare)                      │
│  □ Optimize font loading (preload, font-display: swap)                      │
│  □ Monitor Core Web Vitals (LCP, FID, CLS)                                 │
│  □ Implement skeleton loading states                                        │
│  □ Use optimistic UI updates for cart actions                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## CONCLUSION

This comprehensive guide covers the complete landscape of headless commerce implementation using Shopify Hydrogen and alternative platforms. Key takeaways:

1. **Hydrogen is the recommended choice** for Shopify merchants seeking custom storefronts with first-class Storefront API integration.

2. **Architecture matters** - Choose between commerce-led, CMS-led, or composable (MACH) architectures based on your specific needs.

3. **Performance is paramount** - Implement caching, code splitting, and edge deployment for optimal user experience.

4. **Plan for scale** - Consider multi-store, B2B, and subscription features from the start if they're in your roadmap.

5. **Analytics integration** is crucial for understanding customer behavior and optimizing conversion.

The headless approach provides unmatched flexibility but requires careful planning and ongoing maintenance. Start with a solid foundation using the patterns in this guide, and iterate based on real user feedback and performance data.

---

*Section 16: The Headless Commerce System 50X - Complete*
*Part of THE ULTIMATE DEVELOPER GUIDE - OLYMPUS EDITION*

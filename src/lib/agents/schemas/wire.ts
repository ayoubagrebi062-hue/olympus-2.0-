/**
 * OLYMPUS 2.0 - WIRE Agent Output Schema (10X)
 * Page interactivity, SEO, analytics, performance monitoring
 */
import { z } from 'zod';

// SEO
export const OpenGraphSchema = z.object({
  type: z.enum(['website', 'article', 'product']),
  image: z.string(),
  imageAlt: z.string(),
  siteName: z.string(),
});

export const TwitterCardSchema = z.object({
  card: z.enum(['summary', 'summary_large_image', 'app', 'player']),
  site: z.string().optional(),
  creator: z.string().optional(),
});

export const JsonLdSchema = z.object({
  type: z.enum(['WebSite', 'Organization', 'Product', 'Article', 'BreadcrumbList', 'FAQPage']),
  data: z.record(z.unknown()),
});

export const PageSEOSchema = z.object({
  title: z.string().max(60),
  description: z.string(),
  openGraph: OpenGraphSchema,
  twitter: TwitterCardSchema,
  jsonLd: z.array(JsonLdSchema),
  robots: z.object({ index: z.boolean(), follow: z.boolean() }),
  sitemap: z.object({ include: z.boolean(), priority: z.number() }).optional(),
});

// Layouts
export const LayoutTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['dashboard', 'marketing', 'auth', 'docs', 'blog', 'ecommerce']),
  regions: z.object({
    header: z.object({
      sticky: z.boolean().optional(),
      transparent: z.boolean().optional(),
      height: z.string().optional(),
    }).optional(),
    sidebar: z.object({
      position: z.enum(['left', 'right']).optional(),
      collapsible: z.boolean().optional(),
      width: z.string().optional(),
      collapsedWidth: z.string().optional(),
      mobileDrawer: z.boolean().optional(),
      defaultCollapsed: z.boolean().optional(),
    }).optional(),
    content: z.object({
      maxWidth: z.string().optional(),
      padding: z.string().optional(),
      centered: z.boolean().optional(),
    }).optional(),
    footer: z.object({ sticky: z.boolean().optional() }).optional(),
  }),
});

// Data Fetching
export const ServerActionSchema = z.object({
  name: z.string(),
  file: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional(),
  revalidation: z.object({
    type: z.enum(['tag', 'path', 'time']),
    value: z.union([z.string(), z.number()]),
  }).optional(),
  optimisticUpdate: z.boolean().optional(),
  validation: z.string().optional(),
});

export const StreamingConfigSchema = z.object({
  name: z.string(),
  fallback: z.string(),
  loadingUI: z.string().optional(),
});

export const ErrorBoundaryConfigSchema = z.object({
  scope: z.string(),
  fallbackComponent: z.string(),
  resetKeys: z.array(z.string()).optional(),
  onError: z.string().optional(),
});

export const AdvancedDataFetchingSchema = z.object({
  serverActions: z.array(ServerActionSchema).optional(),
  streaming: z.array(StreamingConfigSchema).optional(),
  parallel: z.array(z.unknown()).optional(),
  errorBoundaries: z.array(ErrorBoundaryConfigSchema).optional(),
  caching: z.object({
    strategy: z.string(),
    defaultStaleTime: z.number().optional(),
    defaultCacheTime: z.number().optional(),
    refetchOnWindowFocus: z.boolean().optional(),
    refetchOnReconnect: z.boolean().optional(),
    retry: z.number().optional(),
  }).optional(),
});

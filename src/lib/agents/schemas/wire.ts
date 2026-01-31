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
    header: z
      .object({
        sticky: z.boolean().optional(),
        transparent: z.boolean().optional(),
        height: z.string().optional(),
      })
      .optional(),
    sidebar: z
      .object({
        position: z.enum(['left', 'right']).optional(),
        collapsible: z.boolean().optional(),
        width: z.string().optional(),
        collapsedWidth: z.string().optional(),
        mobileDrawer: z.boolean().optional(),
        defaultCollapsed: z.boolean().optional(),
      })
      .optional(),
    content: z
      .object({
        maxWidth: z.string().optional(),
        padding: z.string().optional(),
        centered: z.boolean().optional(),
      })
      .optional(),
    footer: z.object({ sticky: z.boolean().optional() }).optional(),
  }),
});

// Data Fetching
export const ServerActionSchema = z.object({
  name: z.string(),
  file: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional(),
  revalidation: z
    .object({
      type: z.enum(['tag', 'path', 'time']),
      value: z.union([z.string(), z.number()]),
    })
    .optional(),
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
  caching: z
    .object({
      strategy: z.string(),
      defaultStaleTime: z.number().optional(),
      defaultCacheTime: z.number().optional(),
      refetchOnWindowFocus: z.boolean().optional(),
      refetchOnReconnect: z.boolean().optional(),
      retry: z.number().optional(),
    })
    .optional(),
});

// Analytics
export const WireAnalyticsEventSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  trigger: z.string(),
  properties: z.array(
    z.object({
      name: z.string(),
      type: z.enum(['string', 'number', 'boolean']),
      required: z.boolean().optional(),
    })
  ),
  category: z.string().optional(),
});

export const ConversionGoalSchema = z.object({
  name: z.string(),
  event: z.string(),
  value: z.number().optional(),
});

export const AnalyticsConfigSchema = z.object({
  providers: z.array(
    z.object({
      name: z.enum(['google', 'mixpanel', 'segment', 'plausible', 'posthog']),
      trackingId: z.string(),
    })
  ),
  pageViews: z.object({ automatic: z.boolean() }).optional(),
  events: z.array(WireAnalyticsEventSchema.pick({ name: true, trigger: true, properties: true })),
  conversions: z.array(ConversionGoalSchema),
  funnels: z.array(
    z.object({
      name: z.string(),
      steps: z.array(
        z.object({
          name: z.string(),
          event: z.string(),
          required: z.boolean().optional(),
        })
      ),
    })
  ),
  errorTracking: z
    .object({
      enabled: z.boolean(),
      sampleRate: z.number().optional(),
    })
    .optional(),
});

// Performance
export const PerformanceBudgetSchema = z.object({
  path: z.string(),
  type: z.enum(['bundle', 'page', 'image', 'font']),
  maxSize: z.number(),
  warning: z.number().optional(),
});

export const WirePerformanceSchema = z.object({
  monitoring: z.object({
    webVitals: z.boolean(),
    reportTo: z.enum(['analytics', 'console', 'custom']),
    thresholds: z.object({
      LCP: z.number(),
      FID: z.number(),
      CLS: z.number(),
      INP: z.number(),
      TTFB: z.number(),
      FCP: z.number().optional(),
    }),
    sampleRate: z.number().optional(),
  }),
  budgets: z.array(PerformanceBudgetSchema),
  prefetching: z
    .object({
      strategy: z.enum(['hover', 'viewport', 'none']),
    })
    .optional(),
  imageOptimization: z
    .object({
      formats: z.array(z.enum(['webp', 'avif', 'png', 'jpg'])),
      sizes: z.array(z.number()),
      placeholder: z.enum(['blur', 'dominant-color', 'none']),
      priority: z.array(z.string()),
    })
    .optional(),
});

// Main Output Schema
export const WireOutputSchema = z.object({
  stateManagement: z.unknown().optional(),
  events: z.array(z.unknown()).optional(),
  forms: z.array(z.unknown()).optional(),
  realtime: z.unknown().optional(),
  optimistic: z.array(z.unknown()).optional(),
  cache: z.unknown().optional(),
  navigation: z.unknown().optional(),
  accessibility: z.unknown().optional(),
  seo: z
    .object({
      global: PageSEOSchema.optional(),
      pages: z.record(PageSEOSchema).optional(),
    })
    .optional(),
  layouts: z.array(LayoutTemplateSchema).optional(),
  dataFetching: AdvancedDataFetchingSchema.optional(),
  analytics: AnalyticsConfigSchema.optional(),
  performance: WirePerformanceSchema.optional(),
  constraints: z.array(z.string()).optional(),
  rationale: z.string().min(1),
});

export type WireOutput = z.infer<typeof WireOutputSchema>;

// Helper functions
export function getPageSEO(
  output: Record<string, unknown>,
  pagePath: string
): z.infer<typeof PageSEOSchema> | undefined {
  const seo = output?.seo as any;
  return seo?.pages?.[pagePath];
}

export function getLayoutByType(
  output: Record<string, unknown>,
  type: string
): z.infer<typeof LayoutTemplateSchema> | undefined {
  const layouts = (output as any)?.layouts as z.infer<typeof LayoutTemplateSchema>[] | undefined;
  return layouts?.find((l: any) => l.type === type);
}

export function getServerActions(
  output: Record<string, unknown>
): z.infer<typeof ServerActionSchema>[] {
  const df = (output as any)?.dataFetching;
  return df?.serverActions || [];
}

export function getAnalyticsEvents(output: Record<string, unknown>): any[] {
  const analytics = (output as any)?.analytics;
  return analytics?.events || [];
}

export function getPerformanceBudgets(
  output: Record<string, unknown>
): z.infer<typeof PerformanceBudgetSchema>[] {
  const perf = (output as any)?.performance;
  return perf?.budgets || [];
}

export function exceedsBudget(
  output: Record<string, unknown>,
  filePath: string,
  sizeKB: number
): boolean {
  const budgets = getPerformanceBudgets(output);
  return budgets.some((b: any) => filePath.startsWith(b.path) && sizeKB > b.maxSize);
}

export function generateSitemapEntry(
  output: Record<string, unknown>,
  pagePath: string,
  baseUrl: string
): { url: string; priority: number } | undefined {
  const seo = output?.seo as any;
  const pageSeo = seo?.pages?.[pagePath];
  if (!pageSeo?.sitemap?.include) return undefined;
  return { url: baseUrl + pagePath, priority: pageSeo.sitemap.priority };
}

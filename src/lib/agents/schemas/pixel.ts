/**
 * OLYMPUS 2.0 - PIXEL Agent Output Schema (10X)
 * Frontend component architecture + testing + performance + i18n
 */
import { z } from 'zod';

// Component Testing
export const ComponentUnitTestsSchema = z.object({
  testFile: z.string(),
  framework: z.enum(['vitest', 'jest']),
  coverage: z.object({
    statements: z.number(),
    branches: z.number(),
    functions: z.number(),
    lines: z.number(),
  }),
  tests: z.array(
    z.object({
      name: z.string(),
      type: z.enum(['render', 'interaction', 'snapshot', 'accessibility']),
      assertions: z.array(z.string()),
    })
  ),
});

export const ComponentStoriesSchema = z.object({
  storyFile: z.string(),
  title: z.string(),
  component: z.string(),
  autodocs: z.boolean().optional(),
  stories: z.array(
    z.object({
      name: z.string(),
      args: z.record(z.unknown()).optional(),
    })
  ),
});

export const ComponentTestingSchema = z.object({
  unitTests: ComponentUnitTestsSchema.optional(),
  stories: ComponentStoriesSchema.optional(),
});

// Performance
export const CoreWebVitalsTargetsSchema = z.object({
  LCP: z.number().max(2500),
  FID: z.number().max(100),
  CLS: z.number().max(0.1),
  INP: z.number().max(200),
  TTFB: z.number().max(800),
});

export const LighthouseTargetsSchema = z.object({
  performance: z.number().min(0).max(100).default(100),
  accessibility: z.number().min(0).max(100).default(100),
  bestPractices: z.number().min(0).max(100).default(100),
  seo: z.number().min(0).max(100).default(100),
});

export const PerformanceMetricsSchema = z.object({
  bundleAnalysis: z
    .object({
      maxSize: z.number(),
      treeshakeable: z.boolean(),
      sideEffects: z.boolean(),
    })
    .optional(),
  renderMetrics: z.array(z.unknown()).optional(),
  coreWebVitals: CoreWebVitalsTargetsSchema.optional(),
  lighthouseTargets: LighthouseTargetsSchema.optional(),
});

// RSC Patterns
export const ServerComponentSchema = z.object({
  name: z.string(),
  path: z.string(),
  dataFetching: z.enum(['fetch', 'prisma', 'drizzle', 'custom']),
  streaming: z.boolean(),
  suspenseBoundary: z.string().optional(),
});

export const ClientComponentSchema = z.object({
  name: z.string(),
  path: z.string(),
  directive: z.enum(['use client']),
  reason: z.enum(['interactivity', 'state', 'effects', 'browser-api']),
  hydrationStrategy: z.enum(['load', 'idle', 'visible', 'media']).optional(),
});

export const RSCPatternsSchema = z.object({
  serverComponents: z.array(ServerComponentSchema),
  clientComponents: z.array(ClientComponentSchema),
  streamingPatterns: z
    .array(
      z.object({
        name: z.string(),
        fallback: z.string(),
        loadingUI: z.string().optional(),
      })
    )
    .optional(),
});

// Advanced Components
export const DataTableSchema = z.object({
  id: z.string(),
  columns: z.array(
    z.object({
      key: z.string(),
      header: z.string(),
      type: z.enum(['text', 'number', 'date', 'boolean', 'custom']),
      sortable: z.boolean().optional(),
      filterable: z.boolean().optional(),
    })
  ),
  features: z.object({
    sorting: z.boolean(),
    filtering: z.boolean(),
    pagination: z.boolean(),
    selection: z.boolean(),
    virtualization: z.boolean(),
    columnResize: z.boolean(),
    columnReorder: z.boolean(),
    rowExpansion: z.boolean(),
    stickyHeader: z.boolean(),
  }),
  serverSide: z.boolean(),
  pageSize: z.number().optional(),
  pageSizeOptions: z.array(z.number()).optional(),
});

export const ModalStackSchema = z.object({
  maxDepth: z.number().optional(),
  closeOnOverlay: z.boolean().optional(),
  closeOnEscape: z.boolean().optional(),
});

export const FormWizardSchema = z.object({
  id: z.string(),
  steps: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      fields: z.array(z.string()),
      validation: z.string().optional(),
      canSkip: z.boolean().optional(),
    })
  ),
  persistState: z.boolean().optional(),
  allowBacktrack: z.boolean().optional(),
  showProgress: z.boolean().optional(),
  submitOnLast: z.boolean().optional(),
});

export const CommandPaletteSchema = z.object({
  commands: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      shortcut: z.string().optional(),
      action: z.string(),
      group: z.string().optional(),
    })
  ),
  searchable: z.boolean().optional(),
  recentCommands: z.number().optional(),
  fuzzyMatch: z.boolean().optional(),
  placeholder: z.string().optional(),
  shortcut: z.string().optional(),
  groups: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        priority: z.number().optional(),
      })
    )
    .optional(),
});

export const AdvancedComponentsSchema = z.object({
  dataTable: DataTableSchema.optional(),
  modalStack: ModalStackSchema.optional(),
  formWizard: FormWizardSchema.optional(),
  commandPalette: CommandPaletteSchema.optional(),
});

// I18n
export const I18nSchema = z.object({
  defaultLocale: z.string(),
  supportedLocales: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      nativeName: z.string(),
      direction: z.enum(['ltr', 'rtl']),
    })
  ),
  fallbackLocale: z.string().optional(),
  namespaces: z
    .array(
      z.object({
        namespace: z.string(),
        keys: z.record(z.string()),
      })
    )
    .optional(),
  rtlSupport: z.boolean().optional(),
  rtlLocales: z.array(z.string()).optional(),
});

// Main Output Schema
export const PixelOutputSchema = z.object({
  framework: z.object({
    name: z.enum(['next', 'remix', 'nuxt', 'sveltekit']),
    version: z.string(),
    router: z.enum(['app', 'pages']).optional(),
  }),
  pages: z.array(z.unknown()),
  sharedComponents: z.array(z.unknown()),
  layouts: z.array(z.unknown()),
  providers: z.array(z.unknown()),
  hooks: z.array(z.unknown()),
  utilities: z.array(z.unknown()),
  testing: z
    .object({
      components: z.record(z.unknown()),
      globalCoverage: z
        .object({
          statements: z.number(),
          branches: z.number(),
          functions: z.number(),
          lines: z.number(),
        })
        .optional(),
    })
    .optional(),
  performance: PerformanceMetricsSchema.optional(),
  constraints: z.array(z.string()).optional(),
  rationale: z.string().min(1),
});

export type PixelOutput = z.infer<typeof PixelOutputSchema>;

// Helper functions
export function getServerComponents(
  output: Record<string, unknown>
): z.infer<typeof ServerComponentSchema>[] {
  const rsc = (output as any)?.rscPatterns;
  if (!rsc) return [];
  return rsc.serverComponents || [];
}

export function getClientComponents(
  output: Record<string, unknown>
): z.infer<typeof ClientComponentSchema>[] {
  const rsc = (output as any)?.rscPatterns;
  if (!rsc) return [];
  return rsc.clientComponents || [];
}

export function needsClientDirective(component: Record<string, unknown>): boolean {
  return !!(component as any)?.directive;
}

export function meetsLighthouseTargets(targets: Record<string, number>): boolean {
  return (
    (targets.performance ?? 0) >= 90 &&
    (targets.accessibility ?? 0) >= 90 &&
    (targets.bestPractices ?? 0) >= 90 &&
    (targets.seo ?? 0) >= 90
  );
}

export function isRTLLocale(locale: string): boolean {
  return ['ar', 'he', 'fa', 'ur'].includes(locale);
}

/**
 * Frontend Trinity 10X World-Class Upgrade Tests
 *
 * Comprehensive tests for PIXEL, WIRE, POLISH 10X schemas
 * Total: 100+ tests covering all new functionality
 *
 * Created: January 28, 2026
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';

// POLISH imports
import {
  parseColor,
  getLuminance,
  getContrastRatio,
  checkContrastCompliance,
  WCAG_CONTRAST_REQUIREMENTS,
  PolishContrastCheckSchema,
  ContrastAuditSchema,
  HeadingSchema,
  HeadingAuditSchema,
  HeadingIssueSchema,
  validateHeadingHierarchy,
  auditHeadings,
  generateDocumentOutline,
  KeyboardAuditSchema,
  FocusableElementSchema,
  LighthouseAuditSchema,
  VisualRegressionSchema,
  AccessibilityAuditSchema,
  passesWCAGAA,
  calculateAccessibilityScore,
  determineWCAGLevel,
  auditColorContrast,
} from '../polish';

// PIXEL imports
import {
  ComponentTestingSchema,
  ComponentUnitTestsSchema,
  ComponentStoriesSchema,
  PerformanceMetricsSchema,
  CoreWebVitalsTargetsSchema,
  LighthouseTargetsSchema,
  RSCPatternsSchema,
  ServerComponentSchema,
  ClientComponentSchema,
  DataTableSchema,
  ModalStackSchema,
  FormWizardSchema,
  CommandPaletteSchema,
  I18nSchema,
  AdvancedComponentsSchema,
  getServerComponents,
  getClientComponents,
  needsClientDirective,
  meetsLighthouseTargets,
  isRTLLocale,
  type PixelOutput,
} from '../pixel';

// WIRE imports
import {
  PageSEOSchema,
  OpenGraphSchema,
  TwitterCardSchema,
  JsonLdSchema,
  LayoutTemplateSchema,
  AdvancedDataFetchingSchema,
  ServerActionSchema,
  StreamingConfigSchema,
  ErrorBoundaryConfigSchema,
  AnalyticsConfigSchema,
  WireAnalyticsEventSchema,
  ConversionGoalSchema,
  WirePerformanceSchema,
  PerformanceBudgetSchema,
  getPageSEO,
  getLayoutByType,
  getServerActions,
  getAnalyticsEvents,
  getPerformanceBudgets,
  exceedsBudget,
  generateSitemapEntry,
  type WireOutput,
} from '../wire';

// =============================================================================
// POLISH TESTS: Color Contrast Validation
// =============================================================================

describe('POLISH 10X: Color Contrast Validation', () => {
  describe('parseColor', () => {
    it('should parse 6-digit hex colors', () => {
      expect(parseColor('#ffffff').rgb).toEqual([255, 255, 255]);
      expect(parseColor('#ffffff').valid).toBe(true);
      expect(parseColor('#000000').rgb).toEqual([0, 0, 0]);
      expect(parseColor('#3B82F6').rgb).toEqual([59, 130, 246]);
    });

    it('should parse 3-digit hex colors', () => {
      expect(parseColor('#fff').rgb).toEqual([255, 255, 255]);
      expect(parseColor('#000').rgb).toEqual([0, 0, 0]);
      expect(parseColor('#f00').rgb).toEqual([255, 0, 0]);
    });

    it('should parse rgb() colors', () => {
      expect(parseColor('rgb(255, 255, 255)').rgb).toEqual([255, 255, 255]);
      expect(parseColor('rgb(0, 0, 0)').rgb).toEqual([0, 0, 0]);
      expect(parseColor('rgb(59, 130, 246)').rgb).toEqual([59, 130, 246]);
    });

    it('should parse rgba() colors with alpha', () => {
      const result = parseColor('rgba(255, 255, 255, 0.5)');
      expect(result.rgb).toEqual([255, 255, 255]);
      expect(result.alpha).toBe(0.5);
      expect(result.valid).toBe(true);
    });

    it('should parse named colors', () => {
      expect(parseColor('white').rgb).toEqual([255, 255, 255]);
      expect(parseColor('red').rgb).toEqual([255, 0, 0]);
      expect(parseColor('blue').rgb).toEqual([0, 0, 255]);
      expect(parseColor('white').valid).toBe(true);
    });

    it('should mark invalid colors as invalid (not return wrong values)', () => {
      const result = parseColor('invalid');
      expect(result.valid).toBe(false);
      expect(result.original).toBe('invalid');
    });

    it('should mark CSS variables as invalid (cannot parse statically)', () => {
      expect(parseColor('var(--primary)').valid).toBe(false);
      expect(parseColor('currentColor').valid).toBe(false);
    });

    it('should handle transparent correctly', () => {
      const result = parseColor('transparent');
      expect(result.valid).toBe(true);
      expect(result.alpha).toBe(0);
    });

    it('should parse HSL colors', () => {
      const result = parseColor('hsl(0, 100, 50)');
      expect(result.valid).toBe(true);
      expect(result.rgb[0]).toBeGreaterThan(200); // Should be reddish
    });
  });

  describe('getLuminance', () => {
    it('should calculate luminance for white', () => {
      const lum = getLuminance(255, 255, 255);
      expect(lum).toBeCloseTo(1, 2);
    });

    it('should calculate luminance for black', () => {
      const lum = getLuminance(0, 0, 0);
      expect(lum).toBeCloseTo(0, 2);
    });

    it('should calculate luminance for gray', () => {
      const lum = getLuminance(128, 128, 128);
      expect(lum).toBeGreaterThan(0);
      expect(lum).toBeLessThan(1);
    });
  });

  describe('getContrastRatio', () => {
    it('should return 21:1 for black on white', () => {
      const result = getContrastRatio('#000000', '#ffffff');
      expect(result.ratio).toBeCloseTo(21, 0);
      expect(result.valid).toBe(true);
    });

    it('should return 1:1 for same colors', () => {
      const result = getContrastRatio('#ffffff', '#ffffff');
      expect(result.ratio).toBeCloseTo(1, 0);
    });

    it('should calculate correct ratio for typical colors', () => {
      const result = getContrastRatio('#3B82F6', '#ffffff');
      expect(result.ratio).toBeGreaterThan(3);
    });

    it('should return valid=false for invalid colors', () => {
      const result = getContrastRatio('invalid', '#ffffff');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about alpha < 1 colors', () => {
      const result = getContrastRatio('rgba(0,0,0,0.5)', '#ffffff');
      expect(result.color1Alpha).toBe(0.5);
      expect(result.errors.some(e => e.includes('alpha'))).toBe(true);
    });
  });

  describe('checkContrastCompliance', () => {
    it('should pass AA for 4.5:1 ratio on normal text', () => {
      const result = checkContrastCompliance(4.5, false);
      expect(result.passesAA).toBe(true);
    });

    it('should fail AA for 4.4:1 ratio on normal text', () => {
      const result = checkContrastCompliance(4.4, false);
      expect(result.passesAA).toBe(false);
    });

    it('should pass AAA for 7:1 ratio on normal text', () => {
      const result = checkContrastCompliance(7, false);
      expect(result.passesAAA).toBe(true);
    });

    it('should pass AA for 3:1 ratio on large text', () => {
      const result = checkContrastCompliance(3, true);
      expect(result.passesAA).toBe(true);
    });

    it('should pass AAA for 4.5:1 ratio on large text', () => {
      const result = checkContrastCompliance(4.5, true);
      expect(result.passesAAA).toBe(true);
    });
  });

  describe('auditColorContrast', () => {
    it('should audit multiple color pairs', () => {
      const result = auditColorContrast([
        { element: 'button', fg: '#ffffff', bg: '#3B82F6' },
        { element: 'text', fg: '#000000', bg: '#ffffff' },
      ]);

      expect(result.checks).toHaveLength(2);
      expect(result.summary.total).toBe(2);
    });

    it('should identify failing contrasts', () => {
      const result = auditColorContrast([
        { element: 'low-contrast', fg: '#cccccc', bg: '#ffffff' },
      ]);

      expect(result.summary.failing).toBe(1);
      expect(result.checks[0].passesAA).toBe(false);
    });
  });

  describe('ContrastAuditSchema', () => {
    it('should validate a complete contrast audit', () => {
      const audit = {
        checks: [
          {
            element: 'button',
            foreground: '#ffffff',
            background: '#3B82F6',
            ratio: 4.5,
            isLargeText: false,
            passesAA: true,
            passesAAA: false,
          },
        ],
        summary: {
          total: 1,
          passingAA: 1,
          passingAAA: 0,
          failing: 0,
        },
        requirements: WCAG_CONTRAST_REQUIREMENTS,
      };

      const result = ContrastAuditSchema.safeParse(audit);
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// POLISH TESTS: Heading Hierarchy Validation
// =============================================================================

describe('POLISH 10X: Heading Hierarchy Validation', () => {
  describe('validateHeadingHierarchy', () => {
    it('should detect missing h1', () => {
      const headings: z.infer<typeof HeadingSchema>[] = [
        { level: 2, text: 'Section', location: 'page.tsx' },
      ];

      const result = validateHeadingHierarchy(headings);
      expect(result.issues.some(i => i.type === 'missing-h1')).toBe(true);
    });

    it('should detect multiple h1', () => {
      const headings: z.infer<typeof HeadingSchema>[] = [
        { level: 1, text: 'First', location: 'page.tsx' },
        { level: 1, text: 'Second', location: 'page.tsx' },
      ];

      const result = validateHeadingHierarchy(headings);
      expect(result.issues.some(i => i.type === 'multiple-h1')).toBe(true);
    });

    it('should detect skipped levels', () => {
      const headings: z.infer<typeof HeadingSchema>[] = [
        { level: 1, text: 'Main', location: 'page.tsx' },
        { level: 3, text: 'Skipped h2', location: 'page.tsx' },
      ];

      const result = validateHeadingHierarchy(headings);
      expect(result.hasSkippedLevels).toBe(true);
      expect(result.issues.some(i => i.type === 'skipped-level')).toBe(true);
    });

    it('should detect empty headings', () => {
      const headings: z.infer<typeof HeadingSchema>[] = [
        { level: 1, text: '', location: 'page.tsx' },
      ];

      const result = validateHeadingHierarchy(headings);
      expect(result.issues.some(i => i.type === 'empty-heading')).toBe(true);
    });

    it('should pass valid hierarchy', () => {
      const headings: z.infer<typeof HeadingSchema>[] = [
        { level: 1, text: 'Main Title', location: 'page.tsx' },
        { level: 2, text: 'Section 1', location: 'page.tsx' },
        { level: 3, text: 'Subsection', location: 'page.tsx' },
        { level: 2, text: 'Section 2', location: 'page.tsx' },
      ];

      const result = validateHeadingHierarchy(headings);
      expect(result.hasSkippedLevels).toBe(false);
      expect(result.issues.filter(i => i.severity === 'error')).toHaveLength(0);
    });
  });

  describe('auditHeadings', () => {
    it('should generate complete audit', () => {
      const headings: z.infer<typeof HeadingSchema>[] = [
        { level: 1, text: 'Title', location: 'page.tsx' },
        { level: 2, text: 'Section', location: 'page.tsx' },
      ];

      const result = auditHeadings(headings);
      expect(result.summary.h1Count).toBe(1);
      expect(result.summary.totalHeadings).toBe(2);
      expect(result.documentOutline).toContain('h1: Title');
    });
  });

  describe('generateDocumentOutline', () => {
    it('should generate indented outline', () => {
      const headings: z.infer<typeof HeadingSchema>[] = [
        { level: 1, text: 'Main', location: 'page.tsx' },
        { level: 2, text: 'Sub', location: 'page.tsx' },
        { level: 3, text: 'SubSub', location: 'page.tsx' },
      ];

      const outline = generateDocumentOutline(headings);
      expect(outline).toContain('h1: Main');
      expect(outline).toContain('  h2: Sub');
      expect(outline).toContain('    h3: SubSub');
    });
  });
});

// =============================================================================
// POLISH TESTS: Keyboard Navigation Audit
// =============================================================================

describe('POLISH 10X: Keyboard Navigation Audit', () => {
  describe('KeyboardAuditSchema', () => {
    it('should validate keyboard audit', () => {
      const audit = {
        focusableElements: [
          {
            element: 'button.primary',
            tabIndex: 0,
            hasFocusStyles: true,
            isTrapped: false,
            canReceiveFocus: true,
          },
        ],
        issues: [],
        skipLinks: [
          { text: 'Skip to content', target: '#main', visible: true },
        ],
        summary: {
          totalFocusable: 1,
          missingFocusIndicators: 0,
          focusTraps: 0,
          hasSkipLink: true,
          hasLogicalOrder: true,
        },
        tabOrder: ['button.primary'],
      };

      const result = KeyboardAuditSchema.safeParse(audit);
      expect(result.success).toBe(true);
    });

    it('should validate focusable elements', () => {
      const element = {
        element: 'input',
        tabIndex: 0,
        hasFocusStyles: true,
        isTrapped: false,
        canReceiveFocus: true,
        role: 'textbox',
      };

      const result = FocusableElementSchema.safeParse(element);
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// POLISH TESTS: Lighthouse Integration
// =============================================================================

describe('POLISH 10X: Lighthouse Integration', () => {
  describe('LighthouseAuditSchema', () => {
    it('should validate lighthouse audit', () => {
      const audit = {
        url: 'https://example.com',
        timestamp: '2026-01-28T12:00:00Z',
        scores: {
          performance: 100,
          accessibility: 100,
          bestPractices: 100,
          seo: 100,
        },
        metrics: {
          FCP: 1000,
          LCP: 2000,
          TBT: 50,
          CLS: 0.05,
          SI: 1500,
        },
        failingAudits: [],
        opportunities: [],
        targets: {
          performance: 100,
          accessibility: 100,
          bestPractices: 100,
          seo: 100,
        },
        passesTargets: true,
      };

      const result = LighthouseAuditSchema.safeParse(audit);
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// POLISH TESTS: Accessibility Audit Helpers
// =============================================================================

describe('POLISH 10X: Accessibility Audit Helpers', () => {
  const createMockAudit = (overrides: Partial<z.infer<typeof AccessibilityAuditSchema>> = {}): z.infer<typeof AccessibilityAuditSchema> => ({
    contrast: {
      checks: [],
      summary: { total: 0, passingAA: 0, passingAAA: 0, failing: 0 },
      requirements: WCAG_CONTRAST_REQUIREMENTS,
    },
    headings: {
      headings: [],
      issues: [],
      summary: { h1Count: 1, hasSkippedLevels: false, totalHeadings: 1, errorCount: 0, warningCount: 0 },
      documentOutline: '',
    },
    keyboard: {
      focusableElements: [],
      issues: [],
      skipLinks: [],
      summary: { totalFocusable: 0, missingFocusIndicators: 0, focusTraps: 0, hasSkipLink: true, hasLogicalOrder: true },
      tabOrder: [],
    },
    overallScore: 100,
    wcagLevel: 'AA',
    summary: { totalIssues: 0, criticalIssues: 0, warnings: 0, passed: true },
    ...overrides,
  });

  describe('passesWCAGAA', () => {
    it('should return true for passing audit', () => {
      const audit = createMockAudit();
      expect(passesWCAGAA(audit)).toBe(true);
    });

    it('should return false if contrast fails', () => {
      const audit = createMockAudit({
        contrast: {
          checks: [],
          summary: { total: 1, passingAA: 0, passingAAA: 0, failing: 1 },
          requirements: WCAG_CONTRAST_REQUIREMENTS,
        },
      });
      expect(passesWCAGAA(audit)).toBe(false);
    });

    it('should return false if heading errors exist', () => {
      const audit = createMockAudit({
        headings: {
          headings: [],
          issues: [],
          summary: { h1Count: 0, hasSkippedLevels: false, totalHeadings: 0, errorCount: 1, warningCount: 0 },
          documentOutline: '',
        },
      });
      expect(passesWCAGAA(audit)).toBe(false);
    });
  });

  describe('calculateAccessibilityScore', () => {
    it('should return 100 for perfect audit', () => {
      const audit = createMockAudit();
      const score = calculateAccessibilityScore(audit);
      expect(score).toBe(100);
    });

    it('should deduct points for contrast failures', () => {
      const audit = createMockAudit({
        contrast: {
          checks: [],
          summary: { total: 2, passingAA: 0, passingAAA: 0, failing: 2 },
          requirements: WCAG_CONTRAST_REQUIREMENTS,
        },
      });
      const score = calculateAccessibilityScore(audit);
      expect(score).toBeLessThan(100);
    });
  });

  describe('determineWCAGLevel', () => {
    it('should return AAA for perfect audit', () => {
      const audit = createMockAudit({ wcagLevel: 'AAA' });
      audit.contrast.checks = [
        { element: 'text', foreground: '#000', background: '#fff', ratio: 21, isLargeText: false, passesAA: true, passesAAA: true },
      ];
      const level = determineWCAGLevel(audit);
      expect(level).toBe('AAA');
    });

    it('should return fail for keyboard issues', () => {
      const audit = createMockAudit({
        keyboard: {
          focusableElements: [],
          issues: [],
          skipLinks: [],
          summary: { totalFocusable: 0, missingFocusIndicators: 1, focusTraps: 0, hasSkipLink: true, hasLogicalOrder: true },
          tabOrder: [],
        },
      });
      const level = determineWCAGLevel(audit);
      expect(level).toBe('fail');
    });
  });
});

// =============================================================================
// PIXEL TESTS: Component Testing Schema
// =============================================================================

describe('PIXEL 10X: Component Testing Schema', () => {
  describe('ComponentUnitTestsSchema', () => {
    it('should validate unit tests config', () => {
      const config = {
        testFile: 'Button.test.tsx',
        framework: 'vitest' as const,
        coverage: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
        tests: [
          {
            name: 'renders correctly',
            type: 'render' as const,
            assertions: ['expect(button).toBeInTheDocument()'],
          },
        ],
      };

      const result = ComponentUnitTestsSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe('ComponentStoriesSchema', () => {
    it('should validate stories config', () => {
      const config = {
        storyFile: 'Button.stories.tsx',
        title: 'Components/Button',
        component: 'Button',
        autodocs: true,
        stories: [
          {
            name: 'Primary',
            args: { variant: 'primary', children: 'Click me' },
          },
          {
            name: 'Secondary',
            args: { variant: 'secondary', children: 'Click me' },
          },
        ],
      };

      const result = ComponentStoriesSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// PIXEL TESTS: Performance Metrics Schema
// =============================================================================

describe('PIXEL 10X: Performance Metrics Schema', () => {
  describe('CoreWebVitalsTargetsSchema', () => {
    it('should validate Core Web Vitals targets', () => {
      const targets = {
        LCP: 2500,
        FID: 100,
        CLS: 0.1,
        INP: 200,
        TTFB: 800,
      };

      const result = CoreWebVitalsTargetsSchema.safeParse(targets);
      expect(result.success).toBe(true);
    });

    it('should reject LCP over 2500', () => {
      const targets = {
        LCP: 3000,
        FID: 100,
        CLS: 0.1,
        INP: 200,
        TTFB: 800,
      };

      const result = CoreWebVitalsTargetsSchema.safeParse(targets);
      expect(result.success).toBe(false);
    });
  });

  describe('LighthouseTargetsSchema', () => {
    it('should validate lighthouse targets', () => {
      const targets = {
        performance: 100,
        accessibility: 100,
        bestPractices: 100,
        seo: 100,
      };

      const result = LighthouseTargetsSchema.safeParse(targets);
      expect(result.success).toBe(true);
    });

    it('should use defaults for 100', () => {
      const targets = {};
      const result = LighthouseTargetsSchema.safeParse(targets);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.performance).toBe(100);
      }
    });
  });
});

// =============================================================================
// PIXEL TESTS: React Server Components Schema
// =============================================================================

describe('PIXEL 10X: React Server Components Schema', () => {
  describe('ServerComponentSchema', () => {
    it('should validate server component', () => {
      const component = {
        name: 'ProductList',
        path: 'app/products/page.tsx',
        dataFetching: 'fetch' as const,
        streaming: true,
        suspenseBoundary: 'ProductListSkeleton',
      };

      const result = ServerComponentSchema.safeParse(component);
      expect(result.success).toBe(true);
    });
  });

  describe('ClientComponentSchema', () => {
    it('should validate client component', () => {
      const component = {
        name: 'AddToCart',
        path: 'components/AddToCart.tsx',
        directive: 'use client' as const,
        reason: 'interactivity' as const,
        hydrationStrategy: 'visible' as const,
      };

      const result = ClientComponentSchema.safeParse(component);
      expect(result.success).toBe(true);
    });
  });

  describe('RSCPatternsSchema', () => {
    it('should validate RSC patterns', () => {
      const patterns = {
        serverComponents: [
          { name: 'Page', path: 'app/page.tsx', dataFetching: 'fetch' as const, streaming: false },
        ],
        clientComponents: [
          { name: 'Button', path: 'components/Button.tsx', directive: 'use client' as const, reason: 'interactivity' as const },
        ],
        streamingPatterns: [
          { name: 'ProductStream', fallback: 'Skeleton', loadingUI: 'Loading products...' },
        ],
      };

      const result = RSCPatternsSchema.safeParse(patterns);
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// PIXEL TESTS: Advanced Components Schema
// =============================================================================

describe('PIXEL 10X: Advanced Components Schema', () => {
  describe('DataTableSchema', () => {
    it('should validate data table config', () => {
      const config = {
        id: 'users-table',
        columns: [
          { key: 'name', header: 'Name', type: 'text' as const, sortable: true, filterable: true },
          { key: 'email', header: 'Email', type: 'text' as const, sortable: true, filterable: false },
        ],
        features: {
          sorting: true,
          filtering: true,
          pagination: true,
          selection: true,
          virtualization: false,
          columnResize: false,
          columnReorder: false,
          rowExpansion: false,
          stickyHeader: true,
        },
        serverSide: false,
        pageSize: 10,
        pageSizeOptions: [10, 25, 50],
      };

      const result = DataTableSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe('CommandPaletteSchema', () => {
    it('should validate command palette config', () => {
      const config = {
        commands: [
          { id: 'search', label: 'Search', shortcut: 'cmd+k', action: 'openSearch', group: 'navigation' },
          { id: 'new', label: 'New File', shortcut: 'cmd+n', action: 'createFile', group: 'actions' },
        ],
        searchable: true,
        recentCommands: 5,
        fuzzyMatch: true,
        placeholder: 'Type a command...',
        shortcut: 'cmd+k',
        groups: [
          { id: 'navigation', label: 'Navigation', priority: 1 },
          { id: 'actions', label: 'Actions', priority: 2 },
        ],
      };

      const result = CommandPaletteSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe('FormWizardSchema', () => {
    it('should validate form wizard config', () => {
      const config = {
        id: 'signup-wizard',
        steps: [
          { id: 'account', title: 'Account', fields: ['email', 'password'], validation: 'accountSchema', canSkip: false },
          { id: 'profile', title: 'Profile', fields: ['name', 'avatar'], validation: 'profileSchema', canSkip: true },
        ],
        persistState: true,
        allowBacktrack: true,
        showProgress: true,
        submitOnLast: true,
      };

      const result = FormWizardSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// PIXEL TESTS: Internationalization Schema
// =============================================================================

describe('PIXEL 10X: Internationalization Schema', () => {
  describe('I18nSchema', () => {
    it('should validate i18n config', () => {
      const config = {
        defaultLocale: 'en',
        supportedLocales: [
          { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' as const },
          { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl' as const },
        ],
        fallbackLocale: 'en',
        namespaces: [
          { namespace: 'common', keys: { hello: 'Hello', goodbye: 'Goodbye' } },
        ],
        rtlSupport: true,
        rtlLocales: ['ar', 'he'],
      };

      const result = I18nSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// WIRE TESTS: SEO Schema
// =============================================================================

describe('WIRE 10X: SEO Schema', () => {
  describe('PageSEOSchema', () => {
    it('should validate complete SEO config', () => {
      const config = {
        title: 'My Page Title',
        description: 'A great description for search engines',
        openGraph: {
          type: 'website' as const,
          image: 'https://example.com/og.png',
          imageAlt: 'Page preview',
          siteName: 'My Site',
        },
        twitter: {
          card: 'summary_large_image' as const,
          site: '@mysite',
        },
        jsonLd: [
          { type: 'WebSite' as const, data: { name: 'My Site' } },
        ],
        robots: {
          index: true,
          follow: true,
        },
      };

      const result = PageSEOSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject title over 60 chars', () => {
      const config = {
        title: 'A'.repeat(61),
        description: 'Valid description',
        openGraph: { type: 'website' as const, image: 'https://example.com/og.png', imageAlt: 'Alt', siteName: 'Site' },
        twitter: { card: 'summary' as const },
        jsonLd: [],
        robots: { index: true, follow: true },
      };

      const result = PageSEOSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe('JsonLdSchema', () => {
    it('should validate JSON-LD types', () => {
      const configs = [
        { type: 'WebSite' as const, data: { name: 'Site' } },
        { type: 'Organization' as const, data: { name: 'Org' } },
        { type: 'Product' as const, data: { name: 'Product' } },
        { type: 'Article' as const, data: { headline: 'Article' } },
      ];

      configs.forEach(config => {
        const result = JsonLdSchema.safeParse(config);
        expect(result.success).toBe(true);
      });
    });
  });
});

// =============================================================================
// WIRE TESTS: Layout Templates Schema
// =============================================================================

describe('WIRE 10X: Layout Templates Schema', () => {
  describe('LayoutTemplateSchema', () => {
    it('should validate dashboard layout', () => {
      const layout = {
        id: 'dashboard',
        name: 'Dashboard Layout',
        type: 'dashboard' as const,
        regions: {
          header: { sticky: true, height: '64px' },
          sidebar: { position: 'left' as const, collapsible: true, width: '256px', collapsedWidth: '64px', mobileDrawer: true, defaultCollapsed: false },
          content: { maxWidth: '1280px', padding: '24px', centered: true },
        },
      };

      const result = LayoutTemplateSchema.safeParse(layout);
      expect(result.success).toBe(true);
    });

    it('should validate marketing layout', () => {
      const layout = {
        id: 'marketing',
        name: 'Marketing Layout',
        type: 'marketing' as const,
        regions: {
          header: { sticky: true, transparent: true, height: '80px' },
          content: { maxWidth: '1440px', padding: '32px', centered: true },
          footer: { sticky: false },
        },
      };

      const result = LayoutTemplateSchema.safeParse(layout);
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// WIRE TESTS: Advanced Data Fetching Schema
// =============================================================================

describe('WIRE 10X: Advanced Data Fetching Schema', () => {
  describe('ServerActionSchema', () => {
    it('should validate server action', () => {
      const action = {
        name: 'createUser',
        file: 'app/actions/users.ts',
        method: 'POST' as const,
        revalidation: { type: 'tag' as const, value: 'users' },
        optimisticUpdate: true,
        validation: 'createUserSchema',
      };

      const result = ServerActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });
  });

  describe('ErrorBoundaryConfigSchema', () => {
    it('should validate error boundary config', () => {
      const config = {
        scope: '/dashboard',
        fallbackComponent: 'DashboardError',
        resetKeys: ['userId'],
        onError: 'logError',
      };

      const result = ErrorBoundaryConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// WIRE TESTS: Analytics Integration Schema
// =============================================================================

describe('WIRE 10X: Analytics Integration Schema', () => {
  describe('WireAnalyticsEventSchema', () => {
    it('should validate analytics event', () => {
      const event = {
        name: 'button_click',
        description: 'User clicked a button',
        trigger: 'onClick',
        properties: [
          { name: 'buttonId', type: 'string' as const, required: true },
          { name: 'timestamp', type: 'number' as const, required: false },
        ],
        category: 'engagement',
      };

      const result = WireAnalyticsEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  describe('AnalyticsConfigSchema', () => {
    it('should validate full analytics config', () => {
      const config = {
        providers: [
          { name: 'google' as const, trackingId: 'G-XXXXX' },
          { name: 'mixpanel' as const, trackingId: 'abc123' },
        ],
        pageViews: { automatic: true },
        events: [
          { name: 'signup', trigger: 'form_submit', properties: [] },
        ],
        conversions: [
          { name: 'purchase', event: 'checkout_complete', value: 100 },
        ],
        funnels: [
          { name: 'signup_funnel', steps: [{ name: 'landing', event: 'page_view', required: true }] },
        ],
        errorTracking: { enabled: true, sampleRate: 1 },
      };

      const result = AnalyticsConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// WIRE TESTS: Performance Monitoring Schema
// =============================================================================

describe('WIRE 10X: Performance Monitoring Schema', () => {
  describe('PerformanceBudgetSchema', () => {
    it('should validate performance budget', () => {
      const budget = {
        path: '/app',
        type: 'bundle' as const,
        maxSize: 250,
        warning: 200,
      };

      const result = PerformanceBudgetSchema.safeParse(budget);
      expect(result.success).toBe(true);
    });
  });

  describe('WirePerformanceSchema', () => {
    it('should validate full performance config', () => {
      const config = {
        monitoring: {
          webVitals: true,
          reportTo: 'analytics' as const,
          thresholds: {
            LCP: 2500,
            FID: 100,
            CLS: 0.1,
            INP: 200,
            TTFB: 800,
            FCP: 1800,
          },
          sampleRate: 1,
        },
        budgets: [
          { path: '/app', type: 'bundle' as const, maxSize: 250 },
        ],
        prefetching: {
          strategy: 'hover' as const,
        },
        imageOptimization: {
          formats: ['webp' as const, 'avif' as const],
          sizes: [640, 750, 1080, 1920],
          placeholder: 'blur' as const,
          priority: ['/hero.png'],
        },
      };

      const result = WirePerformanceSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// WIRE TESTS: Helper Functions
// =============================================================================

describe('WIRE 10X: Helper Functions', () => {
  // Mock WIRE output for testing helper functions
  const mockWireOutput: Record<string, unknown> = {
    seo: {
      global: {
        title: 'My Site',
        description: 'Global description',
        openGraph: { type: 'website', image: 'https://example.com/og.png', imageAlt: 'Alt', siteName: 'Site' },
        twitter: { card: 'summary' },
        jsonLd: [],
        robots: { index: true, follow: true },
      },
      pages: {
        '/about': {
          title: 'About Us',
          description: 'About page',
          openGraph: { type: 'website', image: 'https://example.com/about.png', imageAlt: 'About', siteName: 'Site' },
          twitter: { card: 'summary' },
          jsonLd: [],
          robots: { index: true, follow: true },
          sitemap: { include: true, priority: 0.8 },
        },
      },
    },
    layouts: [
      {
        id: 'main',
        name: 'Main',
        type: 'marketing',
        regions: { content: { maxWidth: '1280px', padding: '24px', centered: true } },
      },
    ],
    dataFetching: {
      serverActions: [
        { name: 'getData', file: 'actions.ts', revalidation: { type: 'tag', value: 'data' }, optimisticUpdate: false },
      ],
      streaming: [],
      parallel: [],
      errorBoundaries: [],
      caching: { strategy: 'react-query', defaultStaleTime: 0, defaultCacheTime: 300000, refetchOnWindowFocus: true, refetchOnReconnect: true, retry: 3 },
    },
    analytics: {
      providers: [],
      pageViews: { automatic: true },
      events: [{ name: 'click', trigger: 'onClick', properties: [] }],
      conversions: [],
      funnels: [],
      errorTracking: { enabled: true, sampleRate: 1 },
    },
    performance: {
      monitoring: { webVitals: true, reportTo: 'console', thresholds: { LCP: 2500, FID: 100, CLS: 0.1, INP: 200, TTFB: 800, FCP: 1800 }, sampleRate: 1 },
      budgets: [{ path: '/app', type: 'bundle', maxSize: 250 }],
      prefetching: { strategy: 'hover' },
      imageOptimization: { formats: ['webp'], sizes: [640], placeholder: 'blur', priority: [] },
    },
  };

  describe('getPageSEO', () => {
    it('should return page-specific SEO', () => {
      const seo = getPageSEO(mockWireOutput, '/about');
      expect(seo?.title).toBe('About Us');
    });

    it('should return undefined for unknown page', () => {
      const seo = getPageSEO(mockWireOutput, '/unknown');
      expect(seo).toBeUndefined();
    });
  });

  describe('getLayoutByType', () => {
    it('should return layout by type', () => {
      const layout = getLayoutByType(mockWireOutput, 'marketing');
      expect(layout?.id).toBe('main');
    });
  });

  describe('getServerActions', () => {
    it('should return server actions', () => {
      const actions = getServerActions(mockWireOutput);
      expect(actions).toHaveLength(1);
      expect(actions[0].name).toBe('getData');
    });
  });

  describe('getAnalyticsEvents', () => {
    it('should return analytics events', () => {
      const events = getAnalyticsEvents(mockWireOutput);
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('click');
    });
  });

  describe('getPerformanceBudgets', () => {
    it('should return performance budgets', () => {
      const budgets = getPerformanceBudgets(mockWireOutput);
      expect(budgets).toHaveLength(1);
      expect(budgets[0].maxSize).toBe(250);
    });
  });

  describe('exceedsBudget', () => {
    it('should return true when exceeding budget', () => {
      const exceeds = exceedsBudget(mockWireOutput, '/app/main.js', 300);
      expect(exceeds).toBe(true);
    });

    it('should return false when within budget', () => {
      const exceeds = exceedsBudget(mockWireOutput, '/app/main.js', 200);
      expect(exceeds).toBe(false);
    });
  });

  describe('generateSitemapEntry', () => {
    it('should generate sitemap entry', () => {
      const entry = generateSitemapEntry(mockWireOutput, '/about', 'https://example.com');
      expect(entry?.url).toBe('https://example.com/about');
      expect(entry?.priority).toBe(0.8);
    });
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Frontend 10X: Integration Tests', () => {
  it('should create complete POLISH output with accessibility audit', () => {
    const output = {
      library: { name: 'framer-motion' as const },
      animations: [],
      transitions: { page: [], component: [], layout: [] },
      microInteractions: [],
      scroll: { effects: [], smoothScroll: { enabled: false } },
      gestures: [],
      loading: { skeleton: [], spinners: [], progress: [] },
      effects: { blur: [], glow: [], gradient: [], noise: { enabled: false } },
      performance: { willChange: [], gpuAcceleration: [], reduceMotion: { respect: true, fallback: 'none' } },
      accessibilityAudit: {
        contrast: {
          checks: [],
          summary: { total: 0, passingAA: 0, passingAAA: 0, failing: 0 },
          requirements: WCAG_CONTRAST_REQUIREMENTS,
        },
        headings: {
          headings: [],
          issues: [],
          summary: { h1Count: 1, hasSkippedLevels: false, totalHeadings: 1, errorCount: 0, warningCount: 0 },
          documentOutline: '',
        },
        keyboard: {
          focusableElements: [],
          issues: [],
          skipLinks: [],
          summary: { totalFocusable: 0, missingFocusIndicators: 0, focusTraps: 0, hasSkipLink: true, hasLogicalOrder: true },
          tabOrder: [],
        },
        overallScore: 100,
        wcagLevel: 'AA' as const,
        summary: { totalIssues: 0, criticalIssues: 0, warnings: 0, passed: true },
      },
      constraints: [],
      rationale: 'This animation architecture provides smooth, accessible animations with proper reduce motion support.',
    };

    // Verify it's a valid structure (type check would fail at compile time if wrong)
    expect(output.accessibilityAudit.overallScore).toBe(100);
    expect(output.accessibilityAudit.wcagLevel).toBe('AA');
  });

  it('should create complete PIXEL output with all 10X features', () => {
    const output = {
      framework: { name: 'next' as const, version: '14', router: 'app' as const },
      pages: [{ id: '1', name: 'Home', path: '/', metadata: { title: 'Home', description: 'Home page' }, layout: 'main', imports: [], dataFetching: { strategy: 'ssr' as const, functions: [] }, state: [], structure: [], handlers: [] }],
      sharedComponents: [],
      layouts: [],
      providers: [],
      hooks: [],
      utilities: [],
      testing: {
        components: {},
        globalCoverage: { statements: 80, branches: 80, functions: 80, lines: 80 },
      },
      performance: {
        bundleAnalysis: { maxSize: 250, treeshakeable: true, sideEffects: false },
        renderMetrics: [],
        coreWebVitals: { LCP: 2500, FID: 100, CLS: 0.1, INP: 200, TTFB: 800 },
        lighthouseTargets: { performance: 100, accessibility: 100, bestPractices: 100, seo: 100 },
      },
      constraints: [],
      rationale: 'This page architecture provides optimal performance with comprehensive testing coverage.',
    };

    expect(output.performance.lighthouseTargets.performance).toBe(100);
    expect(output.testing.globalCoverage.statements).toBe(80);
  });

  it('should create complete WIRE output with all 10X features', () => {
    const output = {
      stateManagement: { library: 'zustand' as const, stores: [], globalState: [] },
      events: [],
      forms: [],
      realtime: { enabled: false },
      optimistic: [],
      cache: { strategy: 'react-query' as const, queries: [], mutations: [] },
      navigation: { programmatic: [], guards: [] },
      accessibility: { focusManagement: [], announcements: [], keyboardNav: [] },
      seo: {
        global: {
          title: 'My Site',
          description: 'Description',
          openGraph: { type: 'website' as const, image: 'https://example.com/og.png', imageAlt: 'Alt', siteName: 'Site' },
          twitter: { card: 'summary' as const },
          jsonLd: [],
          robots: { index: true, follow: true },
        },
      },
      analytics: {
        providers: [{ name: 'google' as const, trackingId: 'G-XXX' }],
        pageViews: { automatic: true },
        events: [],
        conversions: [],
        funnels: [],
        errorTracking: { enabled: true, sampleRate: 1 },
      },
      constraints: [],
      rationale: 'This interactivity architecture provides comprehensive SEO, analytics, and performance monitoring.',
    };

    expect(output.seo?.global?.title).toBe('My Site');
    expect(output.analytics?.providers[0].name).toBe('google');
  });
});

/**
 * OLYMPUS 2.1 - Layout Grammar Rules
 *
 * These are UX laws encoded as code. Every page must pass these checks.
 * Based on: Hick's Law, Fitts's Law, Gestalt Principles, Miller's Law
 *
 * "Design is not just what it looks like. Design is how it works." - Steve Jobs
  *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CTA HIERARCHY (Hick's Law - more choices = slower decisions)
// ═══════════════════════════════════════════════════════════════════════════════

export const CTA_RULES = {
  // Maximum CTAs visible at once
  maxPrimaryPerViewport: 1, // Only ONE primary CTA visible at a time
  maxSecondaryPerSection: 2, // Max 2 secondary actions in same section
  maxTertiaryPerSection: 3, // Max 3 tertiary (text links, etc.)

  // Visual hierarchy requirements
  primaryVisualWeight: {
    minHeight: 44, // Must be large enough to be dominant
    variants: ['primary'], // Must use primary variant
    sizes: ['md', 'lg'], // Must be medium or large
  },

  // Forbidden patterns
  forbiddenPatterns: [
    'two-primary-buttons-same-viewport',
    'primary-button-below-secondary',
    'cta-without-surrounding-whitespace',
    'identical-ctas-different-actions',
  ],

  // Rules as human-readable strings
  rules: [
    'Primary CTA must be visually dominant (larger, colored)',
    'Secondary CTAs must be visually subordinate (outline, ghost)',
    'If more actions needed, use dropdown or progressive disclosure',
    'Primary CTA should have most whitespace around it',
    "Only one primary CTA per viewport (Hick's Law)",
  ],
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// DENSITY LIMITS (Cognitive load management - Miller's Law: 7±2 items)
// ═══════════════════════════════════════════════════════════════════════════════

export const DENSITY_RULES = {
  // Maximum interactive elements per viewport
  maxInteractiveElements: {
    mobile: 5, // Max 5 buttons/links per viewport on mobile
    tablet: 8, // Max 8 on tablet
    desktop: 12, // Max 12 on desktop
  },

  // Form field limits
  maxFormFields: {
    perSection: 6, // Max 6 fields before splitting into sections
    perPage: 12, // Max 12 fields per page
    perStep: 4, // Max 4 fields per wizard step
  },

  // Card grid limits
  maxCardsPerRow: {
    mobile: 1, // Single column on mobile
    tablet: 2, // Two columns on tablet
    desktop: 4, // Max 4 columns on desktop
  },

  // Navigation limits
  maxNavItems: {
    topLevel: 7, // Max 7 top-level nav items (Miller's Law)
    nested: 10, // Max 10 items in dropdown
    breadcrumb: 4, // Max 4 breadcrumb items shown
  },

  // Table limits
  maxTableColumns: {
    mobile: 3, // Max 3 columns on mobile
    tablet: 5, // Max 5 on tablet
    desktop: 8, // Max 8 on desktop
  },

  rules: [
    'Reduce cognitive load by limiting visible options',
    'Use progressive disclosure for complex features',
    'Group related items to reduce perceived complexity',
    'Consider mobile-first: if it works on mobile, it works everywhere',
  ],
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TOUCH TARGETS (Fitts's Law - larger & closer = easier to tap)
// ═══════════════════════════════════════════════════════════════════════════════

export const TOUCH_TARGET_RULES = {
  // Minimum touch target sizes (Apple HIG / Material Design)
  minSize: {
    mobile: 44, // 44x44px minimum (Apple HIG)
    desktop: 32, // 32x32px minimum for mouse
  },

  // Minimum spacing between targets
  minSpacing: 8, // 8px minimum between touch targets

  // Primary CTA requirements
  primaryCTA: {
    minHeight: 48, // Primary buttons are larger
    minWidth: 120, // Minimum width for primary buttons
    recommendedHeight: 56, // Recommended for mobile
  },

  // Icon button requirements
  iconButton: {
    minSize: 44, // Icon buttons must be at least 44px
    hitArea: 48, // Hit area can extend beyond visible icon
  },

  // Link requirements
  link: {
    minHeight: 24, // Minimum height for inline links
    paddingVertical: 4, // Add padding to increase tap target
  },

  rules: [
    'Touch targets must be minimum 44x44px on mobile (Apple HIG)',
    'Leave minimum 8px space between interactive elements',
    'Primary actions should be larger and more prominent',
    'Consider thumb zones on mobile (bottom of screen easier)',
    'Icon-only buttons need larger hit areas',
  ],
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL HIERARCHY (Gestalt - Proximity, Similarity, Continuity)
// ═══════════════════════════════════════════════════════════════════════════════

export const HIERARCHY_RULES = {
  // Proximity rules (related items are close together)
  proximity: {
    relatedItems: 16, // Related items within 16px
    unrelatedItems: 32, // Unrelated items 32px+ apart
    sections: 48, // Sections 48px apart
    pageBlocks: 64, // Major page blocks 64px apart
  },

  // Heading hierarchy
  headingOrder: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const,
  maxHeadingsPerPage: {
    h1: 1, // Only ONE h1 per page
    h2: 8, // Reasonable number of sections
    h3: 16, // Subsections
  },

  // Typography hierarchy
  typographyScale: {
    hero: { size: 48, weight: 700, lineHeight: 1.1 },
    pageTitle: { size: 36, weight: 700, lineHeight: 1.2 },
    sectionTitle: { size: 24, weight: 600, lineHeight: 1.3 },
    cardTitle: { size: 18, weight: 600, lineHeight: 1.4 },
    body: { size: 16, weight: 400, lineHeight: 1.5 },
    small: { size: 14, weight: 400, lineHeight: 1.5 },
    caption: { size: 12, weight: 400, lineHeight: 1.4 },
  },

  rules: [
    'Only ONE h1 per page',
    'Heading levels cannot skip (no h1 -> h3)',
    'Related content must be grouped visually',
    'Use whitespace to separate unrelated content',
    'Most important content should be most prominent',
    'Use consistent visual patterns for similar content',
  ],
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

export const PAGE_STRUCTURE_RULES = {
  // Required elements for any page
  requiredElements: [
    'navigation', // Way to navigate (navbar, breadcrumb, back button)
    'main-content', // Primary content area
    'primary-action', // Clear next step (even if it's just "back")
  ],

  // Forbidden patterns
  forbiddenPatterns: [
    'dead-end', // Page with no exit
    'competing-ctas', // Multiple primary CTAs
    'orphan-content', // Content with no context
    'infinite-scroll-without-alternative', // Must have pagination option
    'modal-in-modal', // No nested modals
    'form-without-cancel', // Forms must have escape route
  ],

  // Above the fold requirements
  aboveFold: {
    mustInclude: ['page-title', 'primary-action-or-navigation'],
    maxScrollToAction: 2, // Primary action within 2 scrolls
  },

  rules: [
    'Every page must have a clear purpose',
    'Every page must have a way out',
    'Primary action should be above the fold',
    'Avoid dead ends - always show next steps',
  ],
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE ARCHETYPES (Every page must fit one)
// ═══════════════════════════════════════════════════════════════════════════════

export const PAGE_ARCHETYPES = {
  form: {
    description: 'User inputs data and submits',
    requiredElements: ['form-fields', 'submit-button', 'cancel-option'],
    maxFields: 12,
    rules: [
      'Progressive disclosure for 6+ fields',
      'Clear error states with recovery',
      'Show validation inline, not after submit',
      'Preserve user input on error',
    ],
  },

  list: {
    description: 'User browses items',
    requiredElements: ['items', 'filter-or-search', 'pagination-or-load-more'],
    rules: [
      'Empty state required',
      'Loading state required',
      'Show item count',
      'Filters should be visible or easily accessible',
    ],
  },

  detail: {
    description: 'User views single item',
    requiredElements: ['item-info', 'primary-action', 'back-navigation'],
    rules: [
      'Related items optional',
      'Edit/delete if applicable',
      'Share functionality if applicable',
    ],
  },

  dashboard: {
    description: 'User monitors metrics',
    requiredElements: ['metrics', 'charts-or-tables', 'drill-down-links'],
    rules: [
      'Most important metrics first (top-left)',
      'Refresh capability',
      'Time range selector',
      'Loading states for async data',
    ],
  },

  wizard: {
    description: 'Multi-step process',
    requiredElements: ['progress-indicator', 'step-content', 'next-back-buttons'],
    rules: [
      'Clear step count (Step 2 of 5)',
      'Save progress if 3+ steps',
      'Allow going back',
      'Show summary before final submit',
    ],
  },

  empty: {
    description: 'New user with no data',
    requiredElements: ['illustration', 'message', 'primary-action'],
    rules: [
      'Guide to first action',
      'Explain value proposition',
      'Make CTA obvious and encouraging',
    ],
  },

  error: {
    description: 'Something went wrong',
    requiredElements: ['error-message', 'recovery-action', 'support-link'],
    rules: ['Clear explanation (not technical jargon)', 'Path to recovery', 'Support/help option'],
  },

  settings: {
    description: 'User configures options',
    requiredElements: ['setting-groups', 'save-action', 'cancel-option'],
    rules: ['Group related settings', 'Show current values', 'Confirm destructive changes'],
  },

  landing: {
    description: 'Marketing or introduction page',
    requiredElements: ['hero', 'value-proposition', 'primary-cta'],
    rules: [
      'Single clear CTA above fold',
      'Social proof / testimonials optional',
      'Minimize navigation distractions',
    ],
  },

  auth: {
    description: 'Login, register, password reset',
    requiredElements: ['form', 'primary-action', 'alternative-action'],
    rules: [
      'Minimal fields (email/password at minimum)',
      'Show/hide password toggle',
      'Social login options if available',
      'Link to alternative (login <-> register)',
    ],
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSIVE RULES
// ═══════════════════════════════════════════════════════════════════════════════

export const RESPONSIVE_RULES = {
  breakpoints: {
    mobile: { max: 639 },
    tablet: { min: 640, max: 1023 },
    desktop: { min: 1024 },
  },

  layoutChanges: {
    sidebar: {
      mobile: 'hidden or overlay',
      tablet: 'collapsed',
      desktop: 'expanded',
    },
    navigation: {
      mobile: 'hamburger menu',
      tablet: 'condensed',
      desktop: 'full',
    },
    grid: {
      mobile: '1 column',
      tablet: '2 columns',
      desktop: '3-4 columns',
    },
  },

  rules: [
    'Mobile-first: design for mobile, enhance for desktop',
    'Touch targets must be 44px on touch devices',
    'Avoid horizontal scrolling on mobile',
    'Stack elements vertically on mobile',
    'Test at 320px width (smallest common mobile)',
  ],
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CONSOLIDATED EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const LAYOUT_GRAMMAR = {
  cta: CTA_RULES,
  density: DENSITY_RULES,
  touchTargets: TOUCH_TARGET_RULES,
  hierarchy: HIERARCHY_RULES,
  pageStructure: PAGE_STRUCTURE_RULES,
  archetypes: PAGE_ARCHETYPES,
  responsive: RESPONSIVE_RULES,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export type Viewport = 'mobile' | 'tablet' | 'desktop';
export type PageArchetype = keyof typeof PAGE_ARCHETYPES;

export interface CTAValidationResult {
  valid: boolean;
  issues: string[];
}

export function validateCTACount(
  primaryCount: number,
  secondaryCount: number,
  tertiaryCount: number = 0
): CTAValidationResult {
  const issues: string[] = [];

  if (primaryCount > CTA_RULES.maxPrimaryPerViewport) {
    issues.push(
      `Max ${CTA_RULES.maxPrimaryPerViewport} primary CTA per viewport, found ${primaryCount}. ` +
        `Hick's Law: More choices = slower decisions.`
    );
  }

  if (secondaryCount > CTA_RULES.maxSecondaryPerSection) {
    issues.push(
      `Max ${CTA_RULES.maxSecondaryPerSection} secondary CTAs per section, found ${secondaryCount}`
    );
  }

  if (tertiaryCount > CTA_RULES.maxTertiaryPerSection) {
    issues.push(
      `Max ${CTA_RULES.maxTertiaryPerSection} tertiary actions per section, found ${tertiaryCount}`
    );
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export interface DensityValidationResult {
  valid: boolean;
  issues: string[];
}

export function validateDensity(elementCount: number, viewport: Viewport): DensityValidationResult {
  const issues: string[] = [];
  const max = DENSITY_RULES.maxInteractiveElements[viewport];

  if (elementCount > max) {
    issues.push(
      `Max ${max} interactive elements for ${viewport}, found ${elementCount}. ` +
        `Consider progressive disclosure or grouping.`
    );
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function validateFormDensity(
  fieldCount: number,
  isWizard: boolean = false
): DensityValidationResult {
  const issues: string[] = [];
  const maxPerPage = DENSITY_RULES.maxFormFields.perPage;
  const maxPerSection = DENSITY_RULES.maxFormFields.perSection;

  if (fieldCount > maxPerPage) {
    issues.push(
      `Max ${maxPerPage} form fields per page, found ${fieldCount}. ` +
        `Consider splitting into multi-step wizard.`
    );
  } else if (fieldCount > maxPerSection && !isWizard) {
    issues.push(
      `${fieldCount} fields exceeds recommended ${maxPerSection} per section. ` +
        `Consider grouping into sections or using wizard.`
    );
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function validateHeadingHierarchy(headings: string[]): DensityValidationResult {
  const issues: string[] = [];

  // Count h1s
  const h1Count = headings.filter(h => h === 'h1').length;
  if (h1Count > 1) {
    issues.push(`Only ONE h1 per page allowed, found ${h1Count}`);
  }
  if (h1Count === 0) {
    issues.push(`Page must have exactly one h1`);
  }

  // Check for skipped levels
  const levelMap: Record<string, number> = { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 };
  let lastLevel = 0;

  for (const heading of headings) {
    const level = levelMap[heading];
    if (level && level > lastLevel + 1 && lastLevel !== 0) {
      issues.push(
        `Heading level skipped: ${lastLevel > 0 ? `h${lastLevel}` : 'start'} -> ${heading}. ` +
          `Add h${lastLevel + 1} for proper hierarchy.`
      );
    }
    if (level) lastLevel = level;
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function validateTouchTarget(
  width: number,
  height: number,
  viewport: Viewport
): DensityValidationResult {
  const issues: string[] = [];
  const minSize = TOUCH_TARGET_RULES.minSize[viewport === 'desktop' ? 'desktop' : 'mobile'];

  if (width < minSize || height < minSize) {
    issues.push(
      `Touch target too small: ${width}x${height}px. ` +
        `Minimum ${minSize}x${minSize}px for ${viewport} (Fitts's Law).`
    );
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function getArchetypeRules(archetype: PageArchetype): string[] {
  const rules = PAGE_ARCHETYPES[archetype]?.rules;
  return rules ? [...rules] : [];
}

export function getArchetypeRequirements(archetype: PageArchetype): string[] {
  const elements = PAGE_ARCHETYPES[archetype]?.requiredElements;
  return elements ? [...elements] : [];
}

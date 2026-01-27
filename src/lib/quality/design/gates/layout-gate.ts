/**
 * OLYMPUS 2.1 - Layout Grammar Gate
 *
 * Validates CTA count, density, hierarchy, and page structure
 * against UX laws (Hick's Law, Fitts's Law, Miller's Law).
 *
 * Speed: <100ms (instant, deterministic)
 * Cost: $0 (no AI)
 */

import { LAYOUT_GRAMMAR } from '../layout-grammar';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface GateIssue {
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  file?: string;
  line?: number;
  found?: string;
  expected?: string;
  autoFixable: boolean;
}

export interface GateResult {
  passed: boolean;
  score: number;
  issues: GateIssue[];
  stats: {
    filesChecked: number;
    pagesAnalyzed: number;
    ctaViolations: number;
    densityViolations: number;
  };
}

export interface FileToCheck {
  path: string;
  content: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getLineNumber(content: string, index: number): number {
  return content.substring(0, index).split('\n').length;
}

function calculateScore(issues: GateIssue[]): number {
  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  return Math.max(0, 100 - errors * 15 - warnings * 5);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CTA VALIDATION (Hick's Law)
// ═══════════════════════════════════════════════════════════════════════════════

function validateCTAs(content: string, path: string): GateIssue[] {
  const issues: GateIssue[] = [];

  // Count primary buttons (variant="primary" or no variant on prominent buttons)
  const primaryPattern = /variant=["']primary["']/g;
  const primaryMatches = content.match(primaryPattern) || [];
  const primaryCount = primaryMatches.length;

  if (primaryCount > LAYOUT_GRAMMAR.cta.maxPrimaryPerViewport) {
    issues.push({
      rule: 'cta-hierarchy',
      message: `Found ${primaryCount} primary CTAs. Max ${LAYOUT_GRAMMAR.cta.maxPrimaryPerViewport} per viewport`,
      severity: 'error',
      file: path,
      found: `${primaryCount} primary buttons`,
      expected: `Hick's Law: Fewer choices = faster decisions. Use 1 primary CTA.`,
      autoFixable: false,
    });
  }

  // Check for competing CTAs (multiple large primary buttons)
  const largePrimaryPattern =
    /size=["']lg["'][^>]*variant=["']primary["']|variant=["']primary["'][^>]*size=["']lg["']/g;
  const largePrimaryMatches = content.match(largePrimaryPattern) || [];

  if (largePrimaryMatches.length > 1) {
    issues.push({
      rule: 'competing-ctas',
      message: `Found ${largePrimaryMatches.length} large primary buttons competing for attention`,
      severity: 'error',
      file: path,
      found: `${largePrimaryMatches.length} large primary CTAs`,
      expected: "Only one prominent CTA per viewport. Users won't know which to click.",
      autoFixable: false,
    });
  }

  // Check for primary button below secondary (visual hierarchy violation)
  const buttonSections = content.split(/(?=<div|<section|<footer)/i);
  for (const section of buttonSections) {
    const secondaryIndex = section.search(/variant=["'](?:secondary|outline|ghost)["']/);
    const primaryIndex = section.search(/variant=["']primary["']/);

    if (secondaryIndex !== -1 && primaryIndex !== -1 && primaryIndex > secondaryIndex) {
      // Check if they're in the same container (simple heuristic)
      const betweenButtons = section.substring(secondaryIndex, primaryIndex);
      if (!betweenButtons.includes('</div>') && !betweenButtons.includes('</section>')) {
        issues.push({
          rule: 'cta-visual-hierarchy',
          message: 'Primary button appears after secondary button in same section',
          severity: 'warning',
          file: path,
          found: 'Secondary button before primary button',
          expected: 'Primary action should be visually first/prominent',
          autoFixable: false,
        });
        break;
      }
    }
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DENSITY VALIDATION (Miller's Law: 7±2 items)
// ═══════════════════════════════════════════════════════════════════════════════

function validateDensity(content: string, path: string): GateIssue[] {
  const issues: GateIssue[] = [];

  // Count interactive elements
  const interactivePattern =
    /<(Button|button|a|Link|input|select|textarea|Switch|Checkbox|Radio)/gi;
  const interactiveMatches = content.match(interactivePattern) || [];
  const interactiveCount = interactiveMatches.length;

  const maxDesktop = LAYOUT_GRAMMAR.density.maxInteractiveElements.desktop;

  // Allow some tolerance (1.5x) since we're counting whole file, not viewport
  if (interactiveCount > maxDesktop * 2) {
    issues.push({
      rule: 'density-overload',
      message: `Found ${interactiveCount} interactive elements in this file`,
      severity: 'warning',
      file: path,
      found: `${interactiveCount} interactive elements`,
      expected: `Consider if all are needed. Miller's Law: ~7 items optimal.`,
      autoFixable: false,
    });
  }

  // Count form fields specifically
  const formFieldPattern = /<(Input|Select|Textarea|input|select|textarea)(?:\s|>|\/)/gi;
  const formFieldMatches = content.match(formFieldPattern) || [];
  const formFieldCount = formFieldMatches.length;

  if (formFieldCount > LAYOUT_GRAMMAR.density.maxFormFields.perPage) {
    issues.push({
      rule: 'form-complexity',
      message: `Found ${formFieldCount} form fields`,
      severity: 'warning',
      file: path,
      found: `${formFieldCount} form fields`,
      expected: `Max ${LAYOUT_GRAMMAR.density.maxFormFields.perPage} per page. Consider multi-step wizard.`,
      autoFixable: false,
    });
  } else if (formFieldCount > LAYOUT_GRAMMAR.density.maxFormFields.perSection) {
    issues.push({
      rule: 'form-section-complexity',
      message: `${formFieldCount} fields may overwhelm users`,
      severity: 'warning',
      file: path,
      found: `${formFieldCount} form fields`,
      expected: `Consider grouping into sections (${LAYOUT_GRAMMAR.density.maxFormFields.perSection} max per section)`,
      autoFixable: false,
    });
  }

  // Count nav items
  const navItemPattern = /<NavItem|<a[^>]*className[^>]*nav/gi;
  const navMatches = content.match(navItemPattern) || [];

  if (navMatches.length > LAYOUT_GRAMMAR.density.maxNavItems.topLevel) {
    issues.push({
      rule: 'nav-complexity',
      message: `Found ${navMatches.length} navigation items`,
      severity: 'warning',
      file: path,
      found: `${navMatches.length} nav items`,
      expected: `Max ${LAYOUT_GRAMMAR.density.maxNavItems.topLevel} top-level items (Miller's Law: 7±2)`,
      autoFixable: false,
    });
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEADING HIERARCHY VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateHeadings(content: string, path: string): GateIssue[] {
  const issues: GateIssue[] = [];

  // Count h1s
  const h1Pattern = /<h1|<H1|<Heading[^>]*(?:level=["']?1|as=["']h1)/gi;
  const h1Matches = content.match(h1Pattern) || [];

  if (h1Matches.length > 1) {
    issues.push({
      rule: 'heading-hierarchy',
      message: `Found ${h1Matches.length} h1 elements`,
      severity: 'error',
      file: path,
      found: `${h1Matches.length} h1 elements`,
      expected: 'Only ONE h1 per page for proper document structure',
      autoFixable: false,
    });
  }

  // Extract heading levels in order
  const headingPattern = /<(h[1-6])|<Heading[^>]*(?:level=["']?([1-6])|as=["'](h[1-6]))/gi;
  const headings: number[] = [];
  let match;

  while ((match = headingPattern.exec(content)) !== null) {
    const level = match[1]
      ? parseInt(match[1].charAt(1))
      : match[2]
        ? parseInt(match[2])
        : match[3]
          ? parseInt(match[3].charAt(1))
          : null;
    if (level) headings.push(level);
  }

  // Check for skipped levels
  for (let i = 1; i < headings.length; i++) {
    const current = headings[i];
    const previous = headings[i - 1];

    if (current > previous + 1) {
      issues.push({
        rule: 'heading-skip',
        message: `Heading level skipped: h${previous} → h${current}`,
        severity: 'warning',
        file: path,
        found: `h${previous} followed by h${current}`,
        expected: `Add h${previous + 1} between them for proper hierarchy`,
        autoFixable: false,
      });
    }
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE STRUCTURE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validatePageStructure(content: string, path: string): GateIssue[] {
  const issues: GateIssue[] = [];

  // Only check page files
  if (!path.includes('page.') && !path.includes('Page.') && !path.includes('/pages/')) {
    return issues;
  }

  // Check for navigation presence
  const hasNav =
    content.includes('<nav') ||
    content.includes('<Navbar') ||
    content.includes('<Sidebar') ||
    content.includes('<Breadcrumb') ||
    content.includes('navigation');

  if (!hasNav && !path.includes('auth') && !path.includes('error') && !path.includes('404')) {
    issues.push({
      rule: 'page-navigation',
      message: 'Page appears to have no navigation element',
      severity: 'warning',
      file: path,
      found: 'No nav, Navbar, Sidebar, or Breadcrumb',
      expected: 'Every page should have a way to navigate',
      autoFixable: false,
    });
  }

  // Check for dead-end (no links or buttons)
  const hasActions =
    content.includes('<Button') ||
    content.includes('<a ') ||
    content.includes('<Link') ||
    content.includes('href=');

  if (!hasActions) {
    issues.push({
      rule: 'page-dead-end',
      message: 'Page has no interactive elements (potential dead-end)',
      severity: 'warning',
      file: path,
      found: 'No buttons or links',
      expected: 'Every page should have a clear next action',
      autoFixable: false,
    });
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOUCH TARGET VALIDATION (Fitts's Law)
// ═══════════════════════════════════════════════════════════════════════════════

function validateTouchTargets(content: string, path: string): GateIssue[] {
  const issues: GateIssue[] = [];

  // Check for small button sizes on mobile-focused pages
  const smallButtonPattern = /size=["'](?:xs|sm)["']/g;
  const smallButtons = content.match(smallButtonPattern) || [];

  // Check for small icon-only buttons
  const iconButtonSmallPattern = /<Button[^>]*size=["'](?:xs|sm)["'][^>]*>\s*<[^>]*Icon/gi;
  const smallIconButtons = content.match(iconButtonSmallPattern) || [];

  if (smallIconButtons.length > 0) {
    issues.push({
      rule: 'touch-target-size',
      message: `Found ${smallIconButtons.length} small icon buttons`,
      severity: 'warning',
      file: path,
      found: 'Small icon buttons (xs/sm)',
      expected: "Icon buttons should be at least 44x44px on mobile (Fitts's Law)",
      autoFixable: false,
    });
  }

  // Check for links that might be too small
  const inlineLinks = content.match(/<a[^>]*>[^<]{1,10}<\/a>/g) || [];
  if (inlineLinks.length > 5) {
    issues.push({
      rule: 'touch-target-links',
      message: `${inlineLinks.length} short inline links may be hard to tap on mobile`,
      severity: 'warning',
      file: path,
      found: `${inlineLinks.length} short links`,
      expected: 'Consider adding padding to increase tap target size',
      autoFixable: false,
    });
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN GATE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function layoutGate(files: FileToCheck[]): Promise<GateResult> {
  const issues: GateIssue[] = [];
  let filesChecked = 0;
  let pagesAnalyzed = 0;
  let ctaViolations = 0;
  let densityViolations = 0;

  for (const file of files) {
    if (!file.path.match(/\.(tsx|jsx)$/)) continue;
    filesChecked++;

    const isPage =
      file.path.includes('page.') || file.path.includes('Page.') || file.path.includes('/pages/');
    if (isPage) pagesAnalyzed++;

    // CTA validation
    const ctaIssues = validateCTAs(file.content, file.path);
    issues.push(...ctaIssues);
    ctaViolations += ctaIssues.filter(i => i.severity === 'error').length;

    // Density validation
    const densityIssues = validateDensity(file.content, file.path);
    issues.push(...densityIssues);
    densityViolations += densityIssues.length;

    // Heading hierarchy
    const headingIssues = validateHeadings(file.content, file.path);
    issues.push(...headingIssues);

    // Page structure (only for page files)
    if (isPage) {
      const structureIssues = validatePageStructure(file.content, file.path);
      issues.push(...structureIssues);
    }

    // Touch targets
    const touchIssues = validateTouchTargets(file.content, file.path);
    issues.push(...touchIssues);
  }

  const errors = issues.filter(i => i.severity === 'error').length;

  return {
    passed: errors === 0,
    score: calculateScore(issues),
    issues,
    stats: { filesChecked, pagesAnalyzed, ctaViolations, densityViolations },
  };
}

export const layoutGrammarGate = {
  name: 'Layout Gate',
  description: "Validates CTA hierarchy, density, and page structure (Hick's Law, Fitts's Law)",
  type: 'layout-grammar' as const,
  check: layoutGate,
};

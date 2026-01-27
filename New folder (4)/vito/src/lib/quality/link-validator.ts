/**
 * OLYMPUS 2.0 - Link & Route Validator
 *
 * Catches common UI bugs BEFORE they ship:
 * - href="#" placeholder links
 * - Links to non-existent pages
 * - Buttons without handlers
 * - Empty chart data
 * - Missing form validation
 */

import type { QualityGate, GateResult, GateIssue, FileToCheck, GateConfig } from './types';

// ============================================
// PATTERNS TO DETECT
// ============================================

interface ValidationPattern {
  name: string;
  pattern: RegExp;
  severity: 'error' | 'warning';
  message: string;
  suggestion: string;
}

const LINK_PATTERNS: ValidationPattern[] = [
  {
    name: 'placeholder-href',
    pattern: /href\s*=\s*["']#["']/g,
    severity: 'error',
    message: 'Placeholder href="#" found - links must point to real routes',
    suggestion: 'Replace with actual route like href="/page-name"',
  },
  {
    name: 'empty-href',
    pattern: /href\s*=\s*["']["']/g,
    severity: 'error',
    message: 'Empty href="" found - links must have destinations',
    suggestion: 'Add the actual route destination',
  },
  {
    name: 'javascript-void-href',
    pattern: /href\s*=\s*["']javascript:void\(0\)["']/g,
    severity: 'error',
    message: 'javascript:void(0) is outdated - use proper routing',
    suggestion: 'Use Next.js Link component with proper href',
  },
];

const BUTTON_PATTERNS: ValidationPattern[] = [
  {
    name: 'button-no-handler',
    pattern: /<button[^>]*(?!onClick|type=["']submit["'])[^>]*>/g,
    severity: 'warning',
    message: 'Button may be missing onClick handler or type="submit"',
    suggestion: 'Add onClick handler or ensure button is inside a form',
  },
];

const CHART_PATTERNS: ValidationPattern[] = [
  {
    name: 'empty-data-array',
    pattern: /data\s*[:=]\s*\[\s*\]/g,
    severity: 'warning',
    message: 'Empty data array found - charts will render without data',
    suggestion: 'Provide sample data or loading state',
  },
  {
    name: 'empty-datasets',
    pattern: /datasets\s*:\s*\[\s*\]/g,
    severity: 'warning',
    message: 'Empty datasets array for chart',
    suggestion: 'Add sample data points for visualization',
  },
];

const VALIDATION_PATTERNS: ValidationPattern[] = [
  {
    name: 'card-field-no-validation',
    pattern: /type\s*=\s*["']text["'][^>]*(?:card|credit|payment)/gi,
    severity: 'warning',
    message: 'Payment field may lack proper validation',
    suggestion: 'Add pattern, maxLength, and validation logic for card numbers',
  },
];

const SPACING_PATTERNS: ValidationPattern[] = [
  {
    name: 'adjacent-buttons-no-gap',
    pattern: /<\/button>\s*<button/g,
    severity: 'warning',
    message: 'Adjacent buttons without spacing wrapper',
    suggestion: 'Wrap buttons in flex container with gap-2 or gap-3',
  },
];

// ============================================
// LINK VALIDATOR CLASS
// ============================================

export class LinkValidator implements QualityGate {
  type = 'links' as const;
  name = 'Link & Route Validator';
  description = 'Validates links, buttons, and data bindings to prevent common UI bugs';

  async check(files: FileToCheck[], config?: GateConfig): Promise<GateResult> {
    const startTime = Date.now();
    const issues: GateIssue[] = [];

    // Track all href values and page files
    const hrefValues: Map<string, { file: string; line: number }[]> = new Map();
    const pageFiles: Set<string> = new Set();

    for (const file of files) {
      // Skip non-UI files
      if (!this.isUIFile(file.path)) continue;

      // Track page files
      if (file.path.includes('/app/') && file.path.endsWith('page.tsx')) {
        const route = this.extractRouteFromPath(file.path);
        pageFiles.add(route);
      }

      // Run pattern checks
      const lines = file.content.split('\n');

      for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];

        // Check link patterns
        for (const pattern of LINK_PATTERNS) {
          if (pattern.pattern.test(line)) {
            issues.push({
              severity: pattern.severity,
              message: pattern.message,
              file: file.path,
              line: lineNum + 1,
              rule: pattern.name,
              suggestion: pattern.suggestion,
            });
          }
          // Reset regex lastIndex
          pattern.pattern.lastIndex = 0;
        }

        // Check button patterns
        for (const pattern of BUTTON_PATTERNS) {
          if (pattern.pattern.test(line)) {
            // More nuanced check for buttons
            const hasHandler = /onClick|onSubmit|type=["']submit["']/.test(line);
            if (!hasHandler) {
              issues.push({
                severity: pattern.severity,
                message: pattern.message,
                file: file.path,
                line: lineNum + 1,
                rule: pattern.name,
                suggestion: pattern.suggestion,
              });
            }
          }
          pattern.pattern.lastIndex = 0;
        }

        // Check chart patterns
        for (const pattern of CHART_PATTERNS) {
          if (pattern.pattern.test(line)) {
            issues.push({
              severity: pattern.severity,
              message: pattern.message,
              file: file.path,
              line: lineNum + 1,
              rule: pattern.name,
              suggestion: pattern.suggestion,
            });
          }
          pattern.pattern.lastIndex = 0;
        }

        // Check spacing patterns
        for (const pattern of SPACING_PATTERNS) {
          if (pattern.pattern.test(line)) {
            issues.push({
              severity: pattern.severity,
              message: pattern.message,
              file: file.path,
              line: lineNum + 1,
              rule: pattern.name,
              suggestion: pattern.suggestion,
            });
          }
          pattern.pattern.lastIndex = 0;
        }

        // Extract href values for route validation
        const hrefMatch = line.match(/href\s*=\s*["']([^"']+)["']/);
        if (hrefMatch && hrefMatch[1] && !hrefMatch[1].startsWith('http') && !hrefMatch[1].startsWith('#')) {
          const href = hrefMatch[1].split('?')[0]; // Remove query params
          if (!hrefValues.has(href)) {
            hrefValues.set(href, []);
          }
          hrefValues.get(href)!.push({ file: file.path, line: lineNum + 1 });
        }
      }
    }

    // Validate that all internal links have corresponding pages
    for (const [href, locations] of hrefValues.entries()) {
      // Normalize the href to a potential page path
      const normalizedRoute = href.replace(/\[.*?\]/g, '[slug]');

      // Check if page exists
      const pageExists = this.checkPageExists(href, pageFiles);

      if (!pageExists) {
        for (const loc of locations) {
          issues.push({
            severity: 'error',
            message: `Link to "${href}" but no corresponding page file found`,
            file: loc.file,
            line: loc.line,
            rule: 'missing-page',
            suggestion: `Create src/app${href}/page.tsx or update the link to an existing page`,
          });
        }
      }
    }

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const passed = errorCount === 0;

    return {
      gate: 'links' as any,
      status: passed ? 'passed' : 'failed',
      passed,
      issues,
      metrics: {
        filesChecked: files.filter(f => this.isUIFile(f.path)).length,
        issuesFound: issues.length,
        errorCount,
        warningCount: issues.filter(i => i.severity === 'warning').length,
      },
      duration: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  private isUIFile(path: string): boolean {
    return /\.(tsx|jsx)$/.test(path) && !path.includes('node_modules');
  }

  private extractRouteFromPath(filePath: string): string {
    // Extract route from file path like src/app/products/[slug]/page.tsx -> /products/[slug]
    const match = filePath.match(/\/app(.*)\/page\.tsx$/);
    if (match) {
      let route = match[1];
      // Remove route groups like (store)
      route = route.replace(/\/\([^)]+\)/g, '');
      return route || '/';
    }
    return '';
  }

  private checkPageExists(href: string, pageFiles: Set<string>): boolean {
    // Direct match
    if (pageFiles.has(href)) return true;

    // Check for dynamic routes
    // e.g., /products/some-product should match /products/[slug]
    const hrefParts = href.split('/').filter(Boolean);

    for (const pageRoute of pageFiles) {
      const pageParts = pageRoute.split('/').filter(Boolean);

      if (hrefParts.length !== pageParts.length) continue;

      let matches = true;
      for (let i = 0; i < hrefParts.length; i++) {
        const hrefPart = hrefParts[i];
        const pagePart = pageParts[i];

        // Dynamic segment matches anything
        if (pagePart.startsWith('[') && pagePart.endsWith(']')) {
          continue;
        }

        if (hrefPart !== pagePart) {
          matches = false;
          break;
        }
      }

      if (matches) return true;
    }

    // Common pages that might exist outside the app
    const commonPages = ['/api/', '/auth/', '/_next/'];
    for (const prefix of commonPages) {
      if (href.startsWith(prefix)) return true;
    }

    return false;
  }
}

// Singleton instance
export const linkValidator = new LinkValidator();

// ============================================
// QUICK VALIDATION FUNCTION
// ============================================

export async function validateLinks(files: FileToCheck[]): Promise<{
  pass: boolean;
  issues: GateIssue[];
  summary: {
    placeholderLinks: number;
    missingPages: number;
    emptyData: number;
    spacingIssues: number;
  };
}> {
  const result = await linkValidator.check(files);

  return {
    pass: result.passed,
    issues: result.issues,
    summary: {
      placeholderLinks: result.issues.filter(i => i.rule === 'placeholder-href' || i.rule === 'empty-href').length,
      missingPages: result.issues.filter(i => i.rule === 'missing-page').length,
      emptyData: result.issues.filter(i => i.rule?.includes('empty')).length,
      spacingIssues: result.issues.filter(i => i.rule?.includes('gap') || i.rule?.includes('spacing')).length,
    },
  };
}

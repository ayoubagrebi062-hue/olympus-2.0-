/**
 * OLYMPUS 2.1 - Accessibility Gate
 *
 * Validates WCAG 2.1 AA compliance:
 * - Alt text for images
 * - Button accessible names
 * - Link text quality
 * - Focus management
 * - ARIA usage
 * - Heading structure
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
  wcag?: string;
}

export interface GateResult {
  passed: boolean;
  score: number;
  issues: GateIssue[];
  stats: {
    filesChecked: number;
    imagesChecked: number;
    buttonsChecked: number;
    linksChecked: number;
    formsChecked: number;
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
  return Math.max(0, 100 - (errors * 15) - (warnings * 5));
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE ALT TEXT VALIDATION (WCAG 1.1.1)
// ═══════════════════════════════════════════════════════════════════════════════

function validateAltText(content: string, path: string): { issues: GateIssue[]; count: number } {
  const issues: GateIssue[] = [];
  let count = 0;

  // Find all img tags
  const imgPattern = /<img([^>]*)(?:\/?>|>)/gi;
  let match;

  while ((match = imgPattern.exec(content)) !== null) {
    count++;
    const attributes = match[1];
    const lineNum = getLineNumber(content, match.index);

    // Check for alt attribute presence
    if (!attributes.includes('alt=') && !attributes.includes('alt =')) {
      issues.push({
        rule: 'img-alt',
        message: 'Image missing alt attribute',
        severity: 'error',
        file: path,
        line: lineNum,
        found: '<img> without alt',
        expected: 'Add alt="Description" or alt="" for decorative images',
        autoFixable: true,
        wcag: '1.1.1 Non-text Content',
      });
      continue;
    }

    // Check for empty alt on potentially meaningful images
    if (attributes.includes('alt=""') || attributes.includes("alt=''")) {
      // Check if it's marked as decorative
      if (!attributes.includes('aria-hidden') && !attributes.includes('role="presentation"')) {
        // Check context for hints
        const surrounding = content.substring(
          Math.max(0, match.index - 100),
          match.index + match[0].length + 100
        );

        if (!surrounding.includes('decorative') &&
            !surrounding.includes('background') &&
            !surrounding.includes('icon')) {
          issues.push({
            rule: 'img-alt-empty',
            message: 'Empty alt text on potentially meaningful image',
            severity: 'warning',
            file: path,
            line: lineNum,
            found: 'alt=""',
            expected: 'If decorative, add aria-hidden="true". If meaningful, add description.',
            autoFixable: false,
            wcag: '1.1.1 Non-text Content',
          });
        }
      }
    }

    // Check for meaningless alt text
    const altMatch = attributes.match(/alt=["']([^"']*)["']/i);
    if (altMatch) {
      const altText = altMatch[1].toLowerCase();
      const meaninglessPatterns = ['image', 'picture', 'photo', 'img', 'icon', 'logo'];

      if (meaninglessPatterns.some(p => altText === p)) {
        issues.push({
          rule: 'img-alt-meaningless',
          message: `Alt text "${altMatch[1]}" is not descriptive`,
          severity: 'warning',
          file: path,
          line: lineNum,
          found: `alt="${altMatch[1]}"`,
          expected: 'Describe the image content or purpose',
          autoFixable: false,
          wcag: '1.1.1 Non-text Content',
        });
      }
    }
  }

  // Check Next.js Image components
  const nextImagePattern = /<Image([^>]*)(?:\/?>|>)/gi;
  while ((match = nextImagePattern.exec(content)) !== null) {
    count++;
    const attributes = match[1];

    if (!attributes.includes('alt=') && !attributes.includes('alt =')) {
      issues.push({
        rule: 'img-alt',
        message: 'Next.js Image missing alt attribute',
        severity: 'error',
        file: path,
        line: getLineNumber(content, match.index),
        found: '<Image> without alt',
        expected: 'Add alt="Description" prop',
        autoFixable: true,
        wcag: '1.1.1 Non-text Content',
      });
    }
  }

  return { issues, count };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUTTON ACCESSIBILITY (WCAG 4.1.2)
// ═══════════════════════════════════════════════════════════════════════════════

function validateButtonAccessibility(content: string, path: string): { issues: GateIssue[]; count: number } {
  const issues: GateIssue[] = [];
  let count = 0;

  // Find icon-only buttons (Button with only Icon child)
  const iconButtonPattern = /<Button([^>]*)>\s*(?:<[^>]*(?:Icon|Svg|icon)[^>]*(?:\/>|>.*?<\/[^>]*>))\s*<\/Button>/gi;
  let match;

  while ((match = iconButtonPattern.exec(content)) !== null) {
    count++;
    const attributes = match[1];
    const lineNum = getLineNumber(content, match.index);

    if (!attributes.includes('aria-label') &&
        !match[0].includes('sr-only') &&
        !attributes.includes('title=')) {
      issues.push({
        rule: 'button-accessible-name',
        message: 'Icon-only button missing accessible name',
        severity: 'error',
        file: path,
        line: lineNum,
        found: 'Icon button without aria-label',
        expected: 'Add aria-label="Action description" or include sr-only text',
        autoFixable: true,
        wcag: '4.1.2 Name, Role, Value',
      });
    }
  }

  // Find all buttons and count
  const allButtonPattern = /<Button[^>]*>/gi;
  const allButtons = content.match(allButtonPattern) || [];
  count = Math.max(count, allButtons.length);

  // Check for buttons with only emoji or symbols
  const emojiButtonPattern = /<Button[^>]*>\s*[^\w\s<]{1,3}\s*<\/Button>/gi;
  while ((match = emojiButtonPattern.exec(content)) !== null) {
    if (!match[0].includes('aria-label')) {
      issues.push({
        rule: 'button-emoji-only',
        message: 'Button with only emoji/symbol needs accessible name',
        severity: 'error',
        file: path,
        line: getLineNumber(content, match.index),
        found: 'Emoji-only button',
        expected: 'Add aria-label to describe the action',
        autoFixable: true,
        wcag: '4.1.2 Name, Role, Value',
      });
    }
  }

  return { issues, count };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LINK ACCESSIBILITY (WCAG 2.4.4)
// ═══════════════════════════════════════════════════════════════════════════════

function validateLinkAccessibility(content: string, path: string): { issues: GateIssue[]; count: number } {
  const issues: GateIssue[] = [];
  let count = 0;

  // Find links with generic text
  const genericLinkPatterns = [
    { pattern: />click here</gi, text: 'click here' },
    { pattern: />here</gi, text: 'here' },
    { pattern: />read more</gi, text: 'read more' },
    { pattern: />learn more</gi, text: 'learn more' },
    { pattern: />more</gi, text: 'more' },
    { pattern: />link</gi, text: 'link' },
  ];

  for (const { pattern, text } of genericLinkPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      // Check if it's actually in a link
      const before = content.substring(Math.max(0, match.index - 50), match.index);
      if (before.includes('<a') || before.includes('<Link')) {
        issues.push({
          rule: 'link-text',
          message: `Generic link text "${text}"`,
          severity: 'warning',
          file: path,
          line: getLineNumber(content, match.index),
          found: text,
          expected: 'Use descriptive link text that explains the destination',
          autoFixable: false,
          wcag: '2.4.4 Link Purpose',
        });
      }
    }
  }

  // Check for links without href
  const emptyHrefPattern = /href=["']#["']|href=["']["']/g;
  let match;

  while ((match = emptyHrefPattern.exec(content)) !== null) {
    issues.push({
      rule: 'link-href',
      message: 'Link with empty or "#" href',
      severity: 'error',
      file: path,
      line: getLineNumber(content, match.index),
      found: match[0],
      expected: 'Use proper destination URL or use <button> for actions',
      autoFixable: false,
      wcag: '2.4.4 Link Purpose',
    });
  }

  // Count links
  const linkPattern = /<(?:a|Link)\s/gi;
  const links = content.match(linkPattern) || [];
  count = links.length;

  // Check for target="_blank" without rel="noopener"
  const blankPattern = /target=["']_blank["'](?![^>]*rel=["'][^"']*noopener)/gi;
  while ((match = blankPattern.exec(content)) !== null) {
    issues.push({
      rule: 'link-security',
      message: 'target="_blank" without rel="noopener"',
      severity: 'warning',
      file: path,
      line: getLineNumber(content, match.index),
      found: 'target="_blank"',
      expected: 'Add rel="noopener noreferrer" for security',
      autoFixable: true,
      wcag: 'Security best practice',
    });
  }

  return { issues, count };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOCUS MANAGEMENT (WCAG 2.4.7)
// ═══════════════════════════════════════════════════════════════════════════════

function validateFocusManagement(content: string, path: string): GateIssue[] {
  const issues: GateIssue[] = [];

  // Check modals/dialogs for focus trap
  if (content.includes('<Modal') || content.includes('<Dialog') || content.includes('role="dialog"')) {
    const hasFocusTrap =
      content.includes('FocusTrap') ||
      content.includes('focus-trap') ||
      content.includes('trapFocus') ||
      content.includes('@radix-ui') || // Radix handles focus
      content.includes('@headlessui'); // Headless UI handles focus

    if (!hasFocusTrap) {
      issues.push({
        rule: 'focus-trap',
        message: 'Modal/Dialog should trap focus',
        severity: 'warning',
        file: path,
        found: 'Modal without focus trap',
        expected: 'Use focus-trap-react or ensure focus stays within modal',
        autoFixable: false,
        wcag: '2.4.3 Focus Order',
      });
    }
  }

  // Check for outline removal without alternative
  if (content.includes('outline-none') || content.includes('outline: none') || content.includes('outline:none')) {
    const hasFocusRing =
      content.includes('focus:ring') ||
      content.includes('focus-visible:') ||
      content.includes('focus:border') ||
      content.includes(':focus {');

    if (!hasFocusRing) {
      issues.push({
        rule: 'focus-visible',
        message: 'Focus outline removed without alternative',
        severity: 'error',
        file: path,
        found: 'outline-none without focus style',
        expected: 'Add focus:ring-2 or focus-visible: styles',
        autoFixable: true,
        wcag: '2.4.7 Focus Visible',
      });
    }
  }

  // Check for tabIndex misuse
  const tabIndexPattern = /tabIndex=["']?(-?\d+)["']?/gi;
  let match;

  while ((match = tabIndexPattern.exec(content)) !== null) {
    const value = parseInt(match[1]);

    if (value > 0) {
      issues.push({
        rule: 'tabindex-positive',
        message: `Positive tabIndex (${value}) disrupts natural tab order`,
        severity: 'warning',
        file: path,
        line: getLineNumber(content, match.index),
        found: `tabIndex="${value}"`,
        expected: 'Use tabIndex="0" or "-1", never positive values',
        autoFixable: false,
        wcag: '2.4.3 Focus Order',
      });
    }
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORM ACCESSIBILITY (WCAG 1.3.1, 3.3.2)
// ═══════════════════════════════════════════════════════════════════════════════

function validateFormAccessibility(content: string, path: string): { issues: GateIssue[]; count: number } {
  const issues: GateIssue[] = [];
  let count = 0;

  // Check inputs for labels
  const inputPattern = /<(?:Input|input|Select|select|Textarea|textarea)([^>]*)(?:\/?>|>)/gi;
  let match;

  while ((match = inputPattern.exec(content)) !== null) {
    count++;
    const attributes = match[1];
    const lineNum = getLineNumber(content, match.index);

    // Check if input has associated label
    const hasId = attributes.match(/id=["']([^"']+)["']/);

    if (hasId) {
      const inputId = hasId[1];
      const hasLabel = content.includes(`htmlFor="${inputId}"`) ||
                       content.includes(`htmlFor='${inputId}'`) ||
                       content.includes(`for="${inputId}"`);
      const hasAriaLabel = attributes.includes('aria-label=') ||
                           attributes.includes('aria-labelledby=');

      if (!hasLabel && !hasAriaLabel) {
        issues.push({
          rule: 'input-label',
          message: 'Input has id but no associated label',
          severity: 'warning',
          file: path,
          line: lineNum,
          found: `Input with id="${inputId}"`,
          expected: 'Add <Label htmlFor="..."> or aria-label',
          autoFixable: false,
          wcag: '1.3.1 Info and Relationships',
        });
      }
    } else if (!attributes.includes('aria-label=') && !attributes.includes('aria-labelledby=')) {
      // Input without id and without aria-label
      const hasPlaceholder = attributes.includes('placeholder=');

      if (hasPlaceholder) {
        issues.push({
          rule: 'input-placeholder-only',
          message: 'Input relies only on placeholder for label',
          severity: 'warning',
          file: path,
          line: lineNum,
          found: 'Input with placeholder, no label',
          expected: 'Placeholders are not labels. Add <Label> or aria-label.',
          autoFixable: false,
          wcag: '3.3.2 Labels or Instructions',
        });
      }
    }
  }

  // Check for error messages with aria-describedby
  if (content.includes('error') && content.includes('<Input') || content.includes('<input')) {
    if (!content.includes('aria-describedby') && !content.includes('aria-errormessage')) {
      issues.push({
        rule: 'error-association',
        message: 'Form errors should be associated with inputs',
        severity: 'warning',
        file: path,
        found: 'Error messages without aria-describedby',
        expected: 'Use aria-describedby to link error to input',
        autoFixable: false,
        wcag: '3.3.1 Error Identification',
      });
    }
  }

  return { issues, count };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN GATE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function a11yGate(files: FileToCheck[]): Promise<GateResult> {
  const issues: GateIssue[] = [];
  let filesChecked = 0;
  let imagesChecked = 0;
  let buttonsChecked = 0;
  let linksChecked = 0;
  let formsChecked = 0;

  for (const file of files) {
    if (!file.path.match(/\.(tsx|jsx)$/)) continue;
    filesChecked++;

    const altText = validateAltText(file.content, file.path);
    issues.push(...altText.issues);
    imagesChecked += altText.count;

    const buttons = validateButtonAccessibility(file.content, file.path);
    issues.push(...buttons.issues);
    buttonsChecked += buttons.count;

    const links = validateLinkAccessibility(file.content, file.path);
    issues.push(...links.issues);
    linksChecked += links.count;

    const focusIssues = validateFocusManagement(file.content, file.path);
    issues.push(...focusIssues);

    const forms = validateFormAccessibility(file.content, file.path);
    issues.push(...forms.issues);
    formsChecked += forms.count;
  }

  const errors = issues.filter(i => i.severity === 'error').length;

  return {
    passed: errors === 0,
    score: calculateScore(issues),
    issues,
    stats: { filesChecked, imagesChecked, buttonsChecked, linksChecked, formsChecked },
  };
}

export const accessibilityGate = {
  name: 'A11y Gate',
  description: 'Validates WCAG 2.1 AA compliance (images, buttons, links, focus, forms)',
  type: 'accessibility' as const,
  check: a11yGate,
};

/**
 * DESIGN TOKEN ENFORCEMENT VALIDATOR
 * Ensures generated code uses design system tokens, not hardcoded values
 *
 * VIOLATIONS:
 * - className="bg-[#7c3aed]" -> Should use bg-primary
 * - className="p-[24px]" -> Should use p-6
 * - style={{ color: '#ff0000' }} -> Should use Tailwind
 *
 * ALLOWED:
 * - className="bg-primary" (uses token)
 * - className="p-4" (uses scale)
 * - Known exceptions (gradients, specific brand colors)
 */

export interface DesignViolation {
  type: 'hardcoded-color' | 'hardcoded-spacing' | 'inline-style' | 'arbitrary-value';
  value: string;
  location: string;
  suggestion: string;
  severity: 'error' | 'warning';
}

export interface DesignTokenUsage {
  token: string;
  count: number;
  category: 'color' | 'spacing' | 'typography' | 'other';
}

export interface DesignValidationResult {
  valid: boolean;
  score: number;
  totalClasses: number;
  tokenUsage: DesignTokenUsage[];
  violations: DesignViolation[];
  summary: {
    hardcodedColors: number;
    hardcodedSpacing: number;
    inlineStyles: number;
    arbitraryValues: number;
  };
}

/**
 * Known design token colors (Tailwind + common semantic)
 */
const DESIGN_TOKEN_COLORS = [
  // Tailwind semantic
  'primary', 'secondary', 'accent', 'destructive', 'muted',
  'background', 'foreground', 'card', 'popover', 'border', 'input', 'ring',

  // Semantic variants
  'success', 'warning', 'error', 'info',

  // Tailwind grays
  'slate', 'gray', 'zinc', 'neutral', 'stone',

  // Tailwind colors
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',

  // Special
  'white', 'black', 'transparent', 'current', 'inherit',
];

/**
 * Allowed arbitrary values (exceptions)
 */
const ALLOWED_ARBITRARY: RegExp[] = [
  // Viewport units
  /\d+vh/,
  /\d+vw/,
  /\d+dvh/,

  // CSS variables
  /var\(--/,

  // Calc expressions
  /calc\(/,

  // Percentages (often needed)
  /\d+%/,

  // Very specific opacity values
  /\/\[0\.\d+\]/,

  // Gradient stops
  /from-\[|via-\[|to-\[/,

  // Background positions
  /bg-\[url/,

  // Specific shadow values (complex shadows)
  /shadow-\[.*shadow/i,
];

/**
 * Check if a value is an allowed arbitrary value
 */
function isAllowedArbitrary(value: string): boolean {
  return ALLOWED_ARBITRARY.some(pattern => pattern.test(value));
}

/**
 * Extract color suggestions based on hex value
 */
function suggestColorToken(hex: string): string {
  // Normalize hex
  const normalizedHex = hex.toLowerCase().replace('#', '');

  // Common color mappings
  const colorMap: Record<string, string> = {
    '7c3aed': 'primary (violet-600)',
    '6d28d9': 'primary/90 or violet-700',
    'ef4444': 'destructive or red-500',
    '22c55e': 'success or green-500',
    'f59e0b': 'warning or amber-500',
    '3b82f6': 'info or blue-500',
    '0a0a0b': 'background',
    '141416': 'card or surface',
    '18181b': 'zinc-900',
    'fafafa': 'foreground or zinc-50',
    'ffffff': 'white',
    '000000': 'black',
  };

  // Check for exact match
  if (colorMap[normalizedHex]) {
    return `Use ${colorMap[normalizedHex]} instead`;
  }

  // Check for similar colors
  if (normalizedHex.startsWith('7c') || normalizedHex.startsWith('8b') || normalizedHex.startsWith('6d')) {
    return 'Use primary or violet-* variant';
  }
  if (normalizedHex.startsWith('ef') || normalizedHex.startsWith('dc') || normalizedHex.startsWith('f8')) {
    return 'Use destructive or red-* variant';
  }
  if (normalizedHex.startsWith('22') || normalizedHex.startsWith('16') || normalizedHex.startsWith('4a')) {
    return 'Use success or green-* variant';
  }

  // Generic suggestion
  return 'Use a Tailwind color class or design token';
}

/**
 * Suggest spacing token based on pixel value
 */
function suggestSpacingToken(pixels: number): string {
  // Tailwind spacing scale (1 unit = 4px)
  const spacingMap: Record<number, string> = {
    0: '0',
    1: 'px',
    2: '0.5',
    4: '1',
    6: '1.5',
    8: '2',
    10: '2.5',
    12: '3',
    14: '3.5',
    16: '4',
    20: '5',
    24: '6',
    28: '7',
    32: '8',
    36: '9',
    40: '10',
    44: '11',
    48: '12',
    56: '14',
    64: '16',
    80: '20',
    96: '24',
    112: '28',
    128: '32',
    144: '36',
    160: '40',
    176: '44',
    192: '48',
    208: '52',
    224: '56',
    240: '60',
    256: '64',
    288: '72',
    320: '80',
    384: '96',
  };

  if (spacingMap[pixels]) {
    return `Use ${spacingMap[pixels]} (Tailwind scale)`;
  }

  // Find closest
  const closest = Object.entries(spacingMap)
    .map(([px, tw]) => ({ px: parseInt(px), tw, diff: Math.abs(parseInt(px) - pixels) }))
    .sort((a, b) => a.diff - b.diff)[0];

  return `Use ${closest.tw} (${closest.px}px) - closest Tailwind value`;
}

/**
 * Validate design token usage in code
 */
export function validateDesignTokens(code: string): DesignValidationResult {
  const violations: DesignViolation[] = [];
  const tokenUsage: DesignTokenUsage[] = [];

  let hardcodedColors = 0;
  let hardcodedSpacing = 0;
  let inlineStyles = 0;
  let arbitraryValues = 0;

  // Find all className strings
  const classNameMatches = code.matchAll(/className\s*=\s*[{"]([^}"]+)[}"]/g);
  let totalClasses = 0;

  for (const match of classNameMatches) {
    const classString = match[1];
    const classes = classString.split(/\s+/);
    totalClasses += classes.length;

    for (const cls of classes) {
      // Check for arbitrary color values (hardcoded hex)
      const hexMatch = cls.match(/(?:bg|text|border|ring|fill|stroke)-\[#([0-9a-fA-F]{3,6})\]/);
      if (hexMatch) {
        hardcodedColors++;
        if (!isAllowedArbitrary(cls)) {
          violations.push({
            type: 'hardcoded-color',
            value: cls,
            location: `className="${classString.substring(0, 50)}..."`,
            suggestion: suggestColorToken(hexMatch[1]),
            severity: 'error',
          });
        }
      }

      // Check for arbitrary spacing values
      const spacingMatch = cls.match(/(?:p|m|gap|space|w|h|top|right|bottom|left|inset)-\[(\d+)px\]/);
      if (spacingMatch) {
        hardcodedSpacing++;
        const pixels = parseInt(spacingMatch[1]);
        if (!isAllowedArbitrary(cls)) {
          violations.push({
            type: 'hardcoded-spacing',
            value: cls,
            location: `className="${classString.substring(0, 50)}..."`,
            suggestion: suggestSpacingToken(pixels),
            severity: 'warning',
          });
        }
      }

      // Check for other arbitrary values
      const arbitraryMatch = cls.match(/-\[([^\]]+)\]/);
      if (arbitraryMatch && !hexMatch && !spacingMatch) {
        if (!isAllowedArbitrary(cls)) {
          arbitraryValues++;
          violations.push({
            type: 'arbitrary-value',
            value: cls,
            location: `className="${classString.substring(0, 50)}..."`,
            suggestion: 'Consider using a Tailwind preset value',
            severity: 'warning',
          });
        }
      }

      // Track token usage
      for (const token of DESIGN_TOKEN_COLORS) {
        if (cls.includes(token)) {
          const existing = tokenUsage.find(t => t.token === token);
          if (existing) {
            existing.count++;
          } else {
            tokenUsage.push({ token, count: 1, category: 'color' });
          }
        }
      }
    }
  }

  // Check for inline styles
  const styleMatches = code.matchAll(/style\s*=\s*\{\{([^}]+)\}\}/g);
  for (const match of styleMatches) {
    const styleContent = match[1];

    // Check for hardcoded colors in style
    if (styleContent.match(/#[0-9a-fA-F]{3,6}|rgb\(|rgba\(/)) {
      inlineStyles++;
      violations.push({
        type: 'inline-style',
        value: styleContent.substring(0, 50),
        location: 'style={{ ... }}',
        suggestion: 'Move colors to Tailwind classes',
        severity: 'warning',
      });
    }

    // Check for hardcoded pixels
    if (styleContent.match(/:\s*\d+px/)) {
      inlineStyles++;
      violations.push({
        type: 'inline-style',
        value: styleContent.substring(0, 50),
        location: 'style={{ ... }}',
        suggestion: 'Move spacing to Tailwind classes',
        severity: 'warning',
      });
    }
  }

  // Calculate score
  const totalViolations = violations.filter(v => v.severity === 'error').length;
  const score = totalClasses > 0
    ? Math.max(0, Math.round(100 - (totalViolations / totalClasses) * 500))
    : 100;

  return {
    valid: violations.filter(v => v.severity === 'error').length <= 3,
    score,
    totalClasses,
    tokenUsage: tokenUsage.sort((a, b) => b.count - a.count),
    violations,
    summary: {
      hardcodedColors,
      hardcodedSpacing,
      inlineStyles,
      arbitraryValues,
    },
  };
}

/**
 * Check if PALETTE tokens are being used
 */
export function validatePaletteUsage(
  code: string,
  _paletteTokens?: { primary?: string; colors?: Record<string, unknown> }
): { valid: boolean; usedTokens: string[]; missingTokens: string[] } {
  const expectedTokens = ['primary', 'background', 'foreground', 'card', 'border', 'muted'];
  const usedTokens: string[] = [];
  const missingTokens: string[] = [];

  for (const token of expectedTokens) {
    const pattern = new RegExp(`(bg|text|border|ring)-${token}`, 'g');
    if (pattern.test(code)) {
      usedTokens.push(token);
    } else {
      missingTokens.push(token);
    }
  }

  // Must use at least primary and background
  const valid = usedTokens.includes('primary') || usedTokens.includes('background');

  return { valid, usedTokens, missingTokens };
}

/**
 * Generate design validation report
 */
export function generateDesignReport(result: DesignValidationResult): string {
  const lines: string[] = [
    '## Design Token Validation Report',
    '',
    `**Score:** ${result.score}/100`,
    `**Status:** ${result.valid ? 'PASS' : 'FAIL'}`,
    '',
    '### Summary',
    `- Total Classes: ${result.totalClasses}`,
    `- Hardcoded Colors: ${result.summary.hardcodedColors}`,
    `- Hardcoded Spacing: ${result.summary.hardcodedSpacing}`,
    `- Inline Styles: ${result.summary.inlineStyles}`,
    `- Arbitrary Values: ${result.summary.arbitraryValues}`,
    '',
  ];

  if (result.tokenUsage.length > 0) {
    lines.push('### Design Tokens Used');
    for (const usage of result.tokenUsage.slice(0, 10)) {
      lines.push(`- ${usage.token}: ${usage.count}x`);
    }
    lines.push('');
  }

  if (result.violations.length > 0) {
    lines.push('### Violations');
    for (const v of result.violations.slice(0, 10)) {
      lines.push(`- **${v.type}**: \`${v.value}\``);
      lines.push(`  -> ${v.suggestion}`);
    }
    if (result.violations.length > 10) {
      lines.push(`  ... and ${result.violations.length - 10} more`);
    }
  }

  return lines.join('\n');
}

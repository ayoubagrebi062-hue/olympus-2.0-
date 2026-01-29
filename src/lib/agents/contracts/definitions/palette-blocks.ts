/**
 * OLYMPUS 2.0 - Contract: PALETTE → BLOCKS
 *
 * PALETTE defines the design system (colors, typography, spacing).
 * BLOCKS needs these tokens to define component variants.
 *
 * HIGH PRIORITY CONTRACT - Design tokens must propagate.
 */

import type { AgentContract, ContractViolation } from '../types';

/**
 * PALETTE → BLOCKS Contract
 *
 * PALETTE must output:
 * - colors with primary, secondary, neutral, semantic
 * - typography with heading and body families
 * - design_tokens with spacing, border_radius, shadows
 */
export const PALETTE_TO_BLOCKS_CONTRACT: AgentContract = {
  upstream: 'palette',
  downstream: 'blocks',

  description:
    'PALETTE must provide complete design tokens for BLOCKS to define component variants',

  criticality: 'high',

  requiredFields: ['colors', 'typography', 'design_tokens'],

  fieldConstraints: {
    // Colors object
    colors: {
      type: 'object',
      mustContain: ['primary', 'neutral', 'semantic'],
      reason: 'BLOCKS needs primary, neutral, and semantic colors',
    },

    // Primary colors must have full scale
    'colors.primary': {
      type: 'object',
      minKeys: 11, // 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950
      reason: 'Primary color scale should have 50-950 shades',
    },

    // Neutral colors for backgrounds/text
    'colors.neutral': {
      type: 'object',
      minKeys: 9, // At least 9 shades
      reason: 'Neutral scale needed for backgrounds and text',
    },

    // Semantic colors for status
    'colors.semantic': {
      type: 'object',
      mustContain: ['success', 'warning', 'error', 'info'],
      reason: 'All semantic colors needed for status indicators',
    },

    // Typography
    typography: {
      type: 'object',
      mustContain: ['heading_family', 'body_family'],
      reason: 'Font families needed for component text',
    },

    // Font families must be valid
    'typography.heading_family': {
      type: 'string',
      minLength: 3,
      mustNotBe: ['font', 'TODO', 'example'],
      reason: 'Must be a valid font family name',
    },

    'typography.body_family': {
      type: 'string',
      minLength: 3,
      mustNotBe: ['font', 'TODO', 'example'],
      reason: 'Must be a valid font family name',
    },

    // Design tokens
    design_tokens: {
      type: 'object',
      mustContain: ['spacing', 'border_radius'],
      reason: 'BLOCKS needs spacing and radius tokens',
    },

    // Spacing scale
    'design_tokens.spacing': {
      type: 'object',
      minKeys: 6, // At least 6 spacing values (xs, sm, md, lg, xl, 2xl)
      reason: 'Spacing scale needed for component layout',
    },

    // Border radius scale
    'design_tokens.border_radius': {
      type: 'object',
      minKeys: 4, // none, sm, md, lg, full
      reason: 'Border radius scale for component shapes',
    },
  },

  expectedFormat: 'structured_json',

  // Custom validation
  customValidation: (output: unknown): ContractViolation[] => {
    const violations: ContractViolation[] = [];
    const data = output as Record<string, unknown>;

    // Validate color values are valid CSS colors
    const colors = data.colors as Record<string, unknown>;
    if (colors) {
      const colorRegex = /^(#[0-9a-fA-F]{3,8}|rgb|rgba|hsl|hsla|oklch)/;

      for (const [scaleName, scale] of Object.entries(colors)) {
        if (typeof scale === 'object' && scale !== null) {
          for (const [shade, value] of Object.entries(scale as Record<string, unknown>)) {
            if (typeof value === 'string' && !colorRegex.test(value)) {
              violations.push({
                field: `colors.${scaleName}.${shade}`,
                constraint: 'valid_color',
                expected: 'Valid CSS color (hex, rgb, hsl, oklch)',
                actual: value.substring(0, 30),
                severity: 'warning',
                suggestion: 'Color value should be valid CSS',
              });
            }
          }
        }
      }

      // Check primary scale has key shades
      const primary = colors.primary as Record<string, unknown>;
      if (primary) {
        const requiredShades = ['500', '600', '700'];
        for (const shade of requiredShades) {
          if (!primary[shade]) {
            violations.push({
              field: `colors.primary.${shade}`,
              constraint: 'required_shade',
              expected: `Primary ${shade} shade`,
              actual: 'missing',
              severity: 'error',
              suggestion: `Primary ${shade} is commonly used for buttons and links`,
            });
          }
        }
      }
    }

    // Validate typography
    const typography = data.typography as Record<string, unknown>;
    if (typography) {
      // Check for font weights
      if (!typography.heading_weights && !typography.weights) {
        violations.push({
          field: 'typography',
          constraint: 'has_weights',
          expected: 'Font weights defined',
          actual: 'No weights found',
          severity: 'warning',
          suggestion: 'Define heading_weights and body_weights for consistency',
        });
      }

      // Check for recommended sizes
      if (!typography.recommended_sizes && !typography.sizes) {
        violations.push({
          field: 'typography',
          constraint: 'has_sizes',
          expected: 'Font sizes defined',
          actual: 'No sizes found',
          severity: 'warning',
          suggestion: 'Define recommended_sizes for h1-h4, body, small',
        });
      }
    }

    // Validate design tokens
    const tokens = data.design_tokens as Record<string, unknown>;
    if (tokens) {
      // Check spacing values are valid
      const spacing = tokens.spacing as Record<string, unknown>;
      if (spacing) {
        const spacingRegex = /^(\d+(\.\d+)?(rem|px|em)|0)$/;
        for (const [name, value] of Object.entries(spacing)) {
          if (typeof value === 'string' && !spacingRegex.test(value)) {
            violations.push({
              field: `design_tokens.spacing.${name}`,
              constraint: 'valid_spacing',
              expected: 'Valid spacing value (e.g., 0.5rem, 8px)',
              actual: value,
              severity: 'warning',
            });
          }
        }
      }

      // Check for shadows
      if (!tokens.shadows) {
        violations.push({
          field: 'design_tokens',
          constraint: 'has_shadows',
          expected: 'Shadow tokens defined',
          actual: 'No shadows found',
          severity: 'info',
          suggestion: 'Shadows useful for cards, modals, dropdowns',
        });
      }

      // Check for transitions
      if (!tokens.transitions) {
        violations.push({
          field: 'design_tokens',
          constraint: 'has_transitions',
          expected: 'Transition tokens defined',
          actual: 'No transitions found',
          severity: 'info',
          suggestion: 'Transitions useful for hover/focus states',
        });
      }
    }

    // Validate accessibility
    const accessibility = data.accessibility as Record<string, unknown>;
    if (!accessibility) {
      violations.push({
        field: 'accessibility',
        constraint: 'exists',
        expected: 'Accessibility section with contrast ratios',
        actual: 'No accessibility section',
        severity: 'warning',
        suggestion: 'Include WCAG contrast ratio compliance info',
      });
    } else {
      if (!accessibility.wcag_level) {
        violations.push({
          field: 'accessibility.wcag_level',
          constraint: 'wcag_defined',
          expected: 'WCAG level (AA or AAA)',
          actual: 'Not defined',
          severity: 'warning',
        });
      }
    }

    return violations;
  },
};

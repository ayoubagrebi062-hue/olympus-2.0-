/**
 * OLYMPUS 2.0 - Contract: BLOCKS → PIXEL
 *
 * BLOCKS produces component specifications.
 * PIXEL needs complete specs to generate component code.
 *
 * CRITICAL CONTRACT - This is where most failures originate.
 */

import type { AgentContract, ContractViolation } from '../types';

/**
 * BLOCKS → PIXEL Contract
 *
 * BLOCKS must output:
 * - 55-60 component specifications
 * - Each with: name, category, anatomy, variants, states, props
 * - No placeholder content
 */
export const BLOCKS_TO_PIXEL_CONTRACT: AgentContract = {
  upstream: 'blocks',
  downstream: 'pixel',

  description:
    'BLOCKS must provide 55+ complete component specifications with anatomy, variants, and states for PIXEL to implement',

  criticality: 'critical',

  requiredFields: ['components'],

  fieldConstraints: {
    // Main components array
    components: {
      type: 'array',
      minCount: 55, // CRITICAL: Must have 55+ components
      reason: 'BLOCKS must generate all 60 components in the atomic design hierarchy',
    },

    // Each component must have required fields
    'components[]': {
      eachMustHave: ['name', 'category', 'description', 'anatomy', 'variants', 'states', 'props'],
      reason: 'Each component needs complete specification for PIXEL to implement',
    },

    // Component names must be valid
    'components[].name': {
      type: 'string',
      minLength: 2,
      mustNotBe: ['Component', 'Example', 'TODO', 'Placeholder'],
      reason: 'Component names must be specific, not generic',
    },

    // Category must be valid atomic design level
    'components[].category': {
      type: 'string',
      mustContain: [], // Will check in custom validation
      reason: 'Must be valid atomic design category',
    },

    // Anatomy must have parts and slots
    'components[].anatomy': {
      type: 'object',
      mustContain: ['parts'],
      minKeys: 1,
      reason: 'PIXEL needs anatomy to structure the component',
    },

    // Variants must be object with at least 2 variants
    'components[].variants': {
      type: 'object',
      minKeys: 2,
      reason: 'Components need multiple variants (e.g., primary, secondary)',
    },

    // States array must have all 8 states
    'components[].states': {
      type: 'array',
      minCount: 8,
      mustContain: [
        'default',
        'hover',
        'focus',
        'active',
        'disabled',
        'loading',
        'error',
        'success',
      ],
      reason: 'All 8 UI states are required for complete component implementation',
    },

    // Props must be defined
    'components[].props': {
      type: 'object',
      minKeys: 1,
      reason: 'Component must have at least one prop',
    },
  },

  expectedFormat: 'structured_json',

  // Custom validation for complex checks
  customValidation: (output: unknown): ContractViolation[] => {
    const violations: ContractViolation[] = [];
    const data = output as Record<string, unknown>;

    if (!data.components || !Array.isArray(data.components)) {
      return violations; // Already caught by required fields check
    }

    const components = data.components as Array<Record<string, unknown>>;

    // Check category distribution (should have atoms, molecules, organisms)
    const categories = new Map<string, number>();
    for (const comp of components) {
      const cat = (comp.category as string) || 'unknown';
      categories.set(cat, (categories.get(cat) || 0) + 1);
    }

    const validCategories = ['atom', 'molecule', 'organism', 'template', 'page'];
    const hasAtoms = categories.has('atom') || categories.has('atoms');
    const hasMolecules = categories.has('molecule') || categories.has('molecules');
    const hasOrganisms = categories.has('organism') || categories.has('organisms');

    if (!hasAtoms) {
      violations.push({
        field: 'components',
        constraint: 'category_distribution',
        expected: 'At least 8 atom components',
        actual: `No atoms found. Categories: ${Array.from(categories.keys()).join(', ')}`,
        severity: 'error',
        suggestion: 'BLOCKS should generate atoms like Button, Input, Icon, Text',
      });
    }

    if (!hasMolecules) {
      violations.push({
        field: 'components',
        constraint: 'category_distribution',
        expected: 'At least 20 molecule components',
        actual: `No molecules found`,
        severity: 'error',
        suggestion: 'BLOCKS should generate molecules like FormField, SearchBar, NavItem',
      });
    }

    if (!hasOrganisms) {
      violations.push({
        field: 'components',
        constraint: 'category_distribution',
        expected: 'At least 15 organism components',
        actual: `No organisms found`,
        severity: 'error',
        suggestion: 'BLOCKS should generate organisms like Header, Footer, Sidebar',
      });
    }

    // Check for duplicate component names
    const names = new Set<string>();
    for (const comp of components) {
      const name = comp.name as string;
      if (names.has(name)) {
        violations.push({
          field: 'components',
          constraint: 'unique_names',
          expected: 'Unique component names',
          actual: `Duplicate: "${name}"`,
          severity: 'warning',
        });
      }
      names.add(name);
    }

    // Check for empty/stub content in variants
    for (let i = 0; i < components.length; i++) {
      const comp = components[i];
      const variants = comp.variants as Record<string, unknown>;
      if (variants) {
        for (const [variantName, variantDef] of Object.entries(variants)) {
          if (typeof variantDef === 'object' && variantDef !== null) {
            const def = variantDef as Record<string, unknown>;
            if (!def.classes && !def.styles && !def.className) {
              violations.push({
                field: `components[${i}].variants.${variantName}`,
                constraint: 'variant_definition',
                expected: 'Variant with classes or styles',
                actual: 'Empty variant definition',
                severity: 'warning',
                suggestion: 'Each variant should define its Tailwind classes',
              });
            }
          }
        }
      }
    }

    return violations;
  },
};

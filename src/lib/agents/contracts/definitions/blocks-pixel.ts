/**
 * OLYMPUS 2.0 - Contract: BLOCKS → PIXEL
 *
 * BLOCKS produces component specifications.
 * PIXEL needs complete specs to generate component code.
 *
 * CRITICAL CONTRACT - This is where most failures originate.
 *
 * FIX 1.1 (Jan 29, 2026): Added strict state schema enforcement with case-insensitive matching
 */

import type { AgentContract, ContractViolation } from '../types';

/**
 * REQUIRED COMPONENT STATES - ALL 8 MUST BE PRESENT
 * Case-insensitive matching is enforced in validation
 */
export const REQUIRED_COMPONENT_STATES = [
  'default',
  'hover',
  'focus',
  'active',
  'disabled',
  'loading',
  'error',
  'success',
] as const;

export type RequiredState = (typeof REQUIRED_COMPONENT_STATES)[number];

/**
 * FIX 6: FORBIDDEN PATTERNS - Detect placeholder content
 * These patterns indicate stub/placeholder content that should be rejected
 */
export const FORBIDDEN_NAME_PATTERNS = [
  /^Component\d*$/i, // "Component", "Component1", "component2"
  /^Example\d*$/i, // "Example", "Example1"
  /^Test\d*$/i, // "Test", "Test1"
  /^Temp\d*$/i, // "Temp", "Temp1"
  /^MyComponent\d*$/i, // "MyComponent", "MyComponent1"
  /^Sample\d*$/i, // "Sample", "Sample1"
  /^Demo\d*$/i, // "Demo", "Demo1"
  /^Placeholder\d*$/i, // "Placeholder"
  /^TODO$/i, // "TODO"
  /^TBD$/i, // "TBD"
  /^Untitled$/i, // "Untitled"
  /^New\s*Component$/i, // "New Component", "NewComponent"
];

export const FORBIDDEN_DESCRIPTION_PATTERNS = [
  /^TODO/i,
  /^TBD/i,
  /^FIXME/i,
  /^Description\s*(here)?$/i,
  /^Add\s+description/i,
  /^Placeholder/i,
  /^\.{3,}$/, // Just "..."
  /^-+$/, // Just dashes
  /^\s*$/, // Empty or whitespace
];

/**
 * Check if a name matches any forbidden pattern
 */
export function isForbiddenName(name: string): boolean {
  return FORBIDDEN_NAME_PATTERNS.some(pattern => pattern.test(name));
}

/**
 * Check if a description matches any forbidden pattern
 */
export function isForbiddenDescription(desc: string): boolean {
  if (!desc || desc.length < 10) return true; // Too short
  return FORBIDDEN_DESCRIPTION_PATTERNS.some(pattern => pattern.test(desc));
}

/**
 * Validates that a component has all 8 required states (case-insensitive)
 * @returns Array of missing states, empty if all present
 */
export function validateComponentStates(states: unknown): string[] {
  if (!Array.isArray(states)) {
    return [...REQUIRED_COMPONENT_STATES]; // All missing if not an array
  }

  const normalizedStates = new Set(
    states.map(s => (typeof s === 'string' ? s.toLowerCase().trim() : ''))
  );

  return REQUIRED_COMPONENT_STATES.filter(required => !normalizedStates.has(required));
}

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

    // States array must have all 8 states (enforced with case-insensitive check in customValidation)
    'components[].states': {
      type: 'array',
      minCount: 8,
      mustContain: REQUIRED_COMPONENT_STATES as unknown as string[],
      reason: `All 8 UI states are required: ${REQUIRED_COMPONENT_STATES.join(', ')}`,
    },

    // Props must be defined
    'components[].props': {
      type: 'object',
      minKeys: 1,
      reason: 'Component must have at least one prop',
    },
  },

  expectedFormat: 'structured_json',

  // Custom validation for complex checks (FIX 1.1: Enhanced state validation)
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

    // FIX 6: PLACEHOLDER DETECTION (Forbidden patterns)
    // Detect and reject stub/placeholder content
    for (let i = 0; i < components.length; i++) {
      const comp = components[i];
      const compName = (comp.name as string) || '';

      // Check for forbidden names
      if (isForbiddenName(compName)) {
        violations.push({
          field: `components[${i}].name`,
          constraint: 'no_placeholder_names',
          expected: 'Real component name like "Button", "Card", "Modal"',
          actual: `"${compName}" is a placeholder name`,
          severity: 'critical',
          suggestion: 'Use descriptive component names that match their purpose',
        });
      }

      // Check for forbidden/empty descriptions
      const desc = (comp.description as string) || '';
      if (isForbiddenDescription(desc)) {
        violations.push({
          field: `components[${i}].description`,
          constraint: 'no_placeholder_description',
          expected: 'Meaningful description (20+ chars)',
          actual: desc.length < 10 ? `Too short: "${desc}"` : `Placeholder: "${desc}"`,
          severity: 'error',
          suggestion: 'Describe what the component does and when to use it',
        });
      }

      // Check for empty arrays in required fields
      const anatomy = comp.anatomy as Record<string, unknown>;
      if (anatomy?.parts && Array.isArray(anatomy.parts) && anatomy.parts.length === 0) {
        violations.push({
          field: `components[${i}].anatomy.parts`,
          constraint: 'no_empty_arrays',
          expected: 'At least 1 part (e.g., "container", "label")',
          actual: 'Empty array []',
          severity: 'error',
          suggestion: 'List the structural parts of this component',
        });
      }

      // Check for empty props
      const props = comp.props;
      if (Array.isArray(props) && props.length === 0) {
        violations.push({
          field: `components[${i}].props`,
          constraint: 'no_empty_arrays',
          expected: 'At least 1 prop definition',
          actual: 'Empty array []',
          severity: 'error',
          suggestion: 'Define at least the variant and/or size prop',
        });
      } else if (typeof props === 'object' && props !== null && Object.keys(props).length === 0) {
        violations.push({
          field: `components[${i}].props`,
          constraint: 'no_empty_objects',
          expected: 'At least 1 prop definition',
          actual: 'Empty object {}',
          severity: 'error',
          suggestion: 'Define at least the variant and/or size prop',
        });
      }
    }

    // FIX 1.1: STRICT STATE VALIDATION (Case-insensitive)
    // This is the primary fix for the 138 state-related violations
    for (let i = 0; i < components.length; i++) {
      const comp = components[i];
      const compName = (comp.name as string) || `Component[${i}]`;

      // Validate states array exists and has all 8 required states
      const missingStates = validateComponentStates(comp.states);
      if (missingStates.length > 0) {
        violations.push({
          field: `components[${i}].states`,
          constraint: 'required_states',
          expected: `All 8 states: ${REQUIRED_COMPONENT_STATES.join(', ')}`,
          actual: `Missing: ${missingStates.join(', ')}`,
          severity: 'critical', // Elevated to critical
          suggestion: `${compName} must include all 8 states for PIXEL to implement properly`,
        });
      }

      // Validate variants count
      const variants = comp.variants as Record<string, unknown>;
      if (variants) {
        const variantCount = Object.keys(variants).length;
        if (variantCount < 2) {
          violations.push({
            field: `components[${i}].variants`,
            constraint: 'min_variants',
            expected: 'At least 2 variants (e.g., default, primary)',
            actual: `${variantCount} variant(s)`,
            severity: 'error',
            suggestion: `${compName} needs at least 2 variants for visual flexibility`,
          });
        }

        // Check for empty/stub content in variants
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

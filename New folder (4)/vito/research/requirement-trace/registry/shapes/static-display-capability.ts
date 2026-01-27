/**
 * StaticDisplayCapability Shape Declaration
 *
 * CRITICALITY: FOUNDATIONAL
 * KIND: INVARIANT
 *
 * Without data display, the application is non-functional.
 * Must survive to PIXEL stage (all handoffs).
 *
 * INVARIANT shapes:
 * - Must survive ALL handoffs
 * - Are NEVER summarized
 * - Bypass summarizeOutputForDependency entirely
 *
 * RSR Law: MUST be 1.0, zero loss tolerated
 */

import type { ShapeDeclaration } from '../types';
import type { ShapeCriticality, ShapeKind } from '../../runtime/types';

// Kind and Criticality are CODE-DEFINED, not configurable
// INVARIANT because it must survive ALL handoffs without summarization
const KIND: ShapeKind = 'INVARIANT';
// FOUNDATIONAL because app is useless without data display
const CRITICALITY: ShapeCriticality = 'FOUNDATIONAL';

export const STATIC_DISPLAY_CAPABILITY: ShapeDeclaration & { criticality: ShapeCriticality; kind: ShapeKind } = {
  id: 'STATIC_DISPLAY_CAPABILITY',
  name: 'Static Display Capability',
  category: 'CONTROL',
  kind: KIND,
  criticality: CRITICALITY,

  attributes: {
    required: [
      'target_entity',
      'display_fields',
      'layout_type'
    ],
    optional: [
      'styling_class',
      'container_type',
      'responsive_breakpoints'
    ]
  },

  survival: {
    must_reach_stage: 'pixel',
    forbidden_loss_classes: [
      'L0_TOTAL_OMISSION',
      'L1_PARTIAL_CAPTURE',
      'L2_SEMANTIC_DRIFT',
      'L3_SPECIFICITY_LOSS',
      'L4_CONTEXT_TRUNCATION',
      'L5_DEPENDENCY_SKIP',
      'L6_SUMMARY_COLLAPSE',
      'L7_SCHEMA_MISMATCH'
    ]
  },

  extraction: {
    root_paths: {
      strategos: ['mvp_features[*]', 'mvp_features[*].description'],
      scope: ['in_scope[*]', 'in_scope[*].description'],
      cartographer: ['pages[*].sections[*].components[*]'],
      blocks: ['components[*]'],
      wire: ['files[*].content'],
      pixel: ['files[*].content', 'components[*]']
    },
    structural_signals: {
      feature_keywords: ['display', 'show', 'view', 'list', 'render'],
      component_types: ['heading', 'text', 'label', 'card', 'list-item', 'data-display'],
      layout_patterns: ['grid', 'flex', 'stack', 'column', 'row'],
      element_patterns: ['div', 'span', 'p', 'h1', 'h2', 'ul', 'li']
    }
  }
};

/**
 * Shape Declarations Index
 *
 * All shapes with their CODE-DEFINED criticality levels and kinds.
 * ORIS (OLYMPUS Runtime Immune System) compliant.
 */

export { FILTER_CAPABILITY } from './filter-capability';
export { PAGINATION_CAPABILITY } from './pagination-capability';
export { STATIC_DISPLAY_CAPABILITY } from './static-display-capability';

import { FILTER_CAPABILITY } from './filter-capability';
import { PAGINATION_CAPABILITY } from './pagination-capability';
import { STATIC_DISPLAY_CAPABILITY } from './static-display-capability';
import type { ShapeDeclaration } from '../types';
import type { ShapeCriticality, ShapeKind } from '../../runtime/types';

// Extended type with criticality and kind (ORIS)
export type CriticalShapeDeclaration = ShapeDeclaration & {
  criticality: ShapeCriticality;
  kind: ShapeKind;
};

export const ALL_SHAPES: CriticalShapeDeclaration[] = [
  FILTER_CAPABILITY,
  PAGINATION_CAPABILITY,
  STATIC_DISPLAY_CAPABILITY
];

export const SHAPE_BY_ID: Record<string, CriticalShapeDeclaration> = {
  FILTER_CAPABILITY,
  PAGINATION_CAPABILITY,
  STATIC_DISPLAY_CAPABILITY
};

// Group by criticality (CODE-DEFINED, not runtime-configurable)
export const SHAPES_BY_CRITICALITY: Record<ShapeCriticality, CriticalShapeDeclaration[]> = {
  FOUNDATIONAL: ALL_SHAPES.filter(s => s.criticality === 'FOUNDATIONAL'),
  INTERACTIVE: ALL_SHAPES.filter(s => s.criticality === 'INTERACTIVE'),
  ENHANCEMENT: ALL_SHAPES.filter(s => s.criticality === 'ENHANCEMENT')
};

// ORIS: Group by kind (CODE-DEFINED, not runtime-configurable)
export const SHAPES_BY_KIND: Record<ShapeKind, CriticalShapeDeclaration[]> = {
  INVARIANT: ALL_SHAPES.filter(s => s.kind === 'INVARIANT'),
  CAPABILITY: ALL_SHAPES.filter(s => s.kind === 'CAPABILITY')
};

// ORIS: Get all invariant shapes (must survive ALL handoffs)
export const INVARIANT_SHAPES: CriticalShapeDeclaration[] = SHAPES_BY_KIND.INVARIANT;

// Freeze to prevent runtime modification
Object.freeze(SHAPES_BY_CRITICALITY);
Object.freeze(SHAPES_BY_CRITICALITY.FOUNDATIONAL);
Object.freeze(SHAPES_BY_CRITICALITY.INTERACTIVE);
Object.freeze(SHAPES_BY_CRITICALITY.ENHANCEMENT);

Object.freeze(SHAPES_BY_KIND);
Object.freeze(SHAPES_BY_KIND.INVARIANT);
Object.freeze(SHAPES_BY_KIND.CAPABILITY);
Object.freeze(INVARIANT_SHAPES);

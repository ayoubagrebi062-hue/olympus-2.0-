/**
 * Shape Matcher
 *
 * Structural matching for FilterCapabilityShape.
 * NO REGEX - STRUCTURE ONLY
 */

import type {
  FilterCapabilityShape,
  ShapeAttribute,
  AttributeEvidence
} from '../types';
import { FilterCapabilityShapeDefinition } from './filter-capability';

/**
 * Compute similarity between two attribute values.
 * Returns 0.0 - 1.0 based on structural equivalence.
 */
export function computeAttributeSimilarity(
  sourceValue: unknown,
  targetValue: unknown
): number {
  // Both undefined/null
  if (sourceValue === undefined && targetValue === undefined) return 1.0;
  if (sourceValue === null && targetValue === null) return 1.0;

  // One missing
  if (sourceValue === undefined || sourceValue === null) return 0.0;
  if (targetValue === undefined || targetValue === null) return 0.0;

  // Exact match
  if (sourceValue === targetValue) return 1.0;

  // String comparison (case-insensitive)
  if (typeof sourceValue === 'string' && typeof targetValue === 'string') {
    if (sourceValue.toLowerCase() === targetValue.toLowerCase()) return 0.95;
    // Check if one contains the other
    const srcLower = sourceValue.toLowerCase();
    const tgtLower = targetValue.toLowerCase();
    if (srcLower.includes(tgtLower) || tgtLower.includes(srcLower)) return 0.7;
    return 0.0;
  }

  // Array comparison
  if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
    if (sourceValue.length === 0 && targetValue.length === 0) return 1.0;
    if (sourceValue.length === 0 || targetValue.length === 0) return 0.0;

    // Count matching elements
    const srcSet = new Set(sourceValue.map(v => String(v).toLowerCase()));
    const tgtSet = new Set(targetValue.map(v => String(v).toLowerCase()));

    let matches = 0;
    for (const item of srcSet) {
      if (tgtSet.has(item)) matches++;
    }

    const union = new Set([...srcSet, ...tgtSet]).size;
    return union > 0 ? matches / union : 0.0;
  }

  // Boolean comparison
  if (typeof sourceValue === 'boolean' && typeof targetValue === 'boolean') {
    return sourceValue === targetValue ? 1.0 : 0.0;
  }

  // Type mismatch
  if (typeof sourceValue !== typeof targetValue) return 0.0;

  // Object comparison (shallow)
  if (typeof sourceValue === 'object' && typeof targetValue === 'object') {
    const srcKeys = Object.keys(sourceValue as object);
    const tgtKeys = Object.keys(targetValue as object);
    const allKeys = new Set([...srcKeys, ...tgtKeys]);

    let matchScore = 0;
    for (const key of allKeys) {
      const srcVal = (sourceValue as Record<string, unknown>)[key];
      const tgtVal = (targetValue as Record<string, unknown>)[key];
      matchScore += computeAttributeSimilarity(srcVal, tgtVal);
    }

    return allKeys.size > 0 ? matchScore / allKeys.size : 0.0;
  }

  return 0.0;
}

/**
 * Shape Matcher class for structural matching
 */
export class ShapeMatcher {
  /**
   * Check if a JSON object structurally matches filter capability indicators
   * Returns extracted shape attributes with evidence
   */
  static extractFromObject(
    obj: unknown,
    context: {
      agentId: string;
      basePath: string;
    }
  ): { shape: Partial<FilterCapabilityShape>; evidence: AttributeEvidence[] } {
    const shape: Partial<FilterCapabilityShape> = {};
    const evidence: AttributeEvidence[] = [];

    if (!obj || typeof obj !== 'object') {
      return { shape, evidence };
    }

    const record = obj as Record<string, unknown>;

    // Extract target_entity
    const entityKeys = ['entity', 'target', 'resource', 'model', 'type'];
    for (const key of entityKeys) {
      if (record[key] && typeof record[key] === 'string') {
        shape.target_entity = record[key] as string;
        evidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
          'target_entity',
          record[key],
          `${context.basePath}.${key}`,
          0.9
        ));
        break;
      }
    }

    // Extract filter_attribute
    const attrKeys = ['attribute', 'field', 'property', 'filterBy', 'filter_attribute'];
    for (const key of attrKeys) {
      if (record[key] && typeof record[key] === 'string') {
        shape.filter_attribute = record[key] as string;
        evidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
          'filter_attribute',
          record[key],
          `${context.basePath}.${key}`,
          0.9
        ));
        break;
      }
    }

    // Extract filter_values
    const valuesKeys = ['values', 'options', 'items', 'choices', 'filter_values', 'variants'];
    for (const key of valuesKeys) {
      if (Array.isArray(record[key]) && record[key].length > 0) {
        shape.filter_values = record[key] as string[];
        evidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
          'filter_values',
          record[key],
          `${context.basePath}.${key}`,
          0.9
        ));
        break;
      }
    }

    // Extract filter_type
    const typeKeys = ['type', 'filter_type', 'filterType'];
    for (const key of typeKeys) {
      const val = record[key];
      if (val === 'discrete' || val === 'range' || val === 'search') {
        shape.filter_type = val;
        evidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
          'filter_type',
          val,
          `${context.basePath}.${key}`,
          1.0
        ));
        break;
      }
    }

    // Extract ui_control
    const controlKeys = ['control', 'ui_control', 'component', 'uiType'];
    for (const key of controlKeys) {
      const val = record[key];
      if (typeof val === 'string' && ['tabs', 'dropdown', 'buttons', 'chips', 'select'].includes(val.toLowerCase())) {
        shape.ui_control = val.toLowerCase() as FilterCapabilityShape['ui_control'];
        evidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
          'ui_control',
          val,
          `${context.basePath}.${key}`,
          1.0
        ));
        break;
      }
    }

    // Extract default_value
    const defaultKeys = ['default', 'defaultValue', 'default_value', 'initialValue'];
    for (const key of defaultKeys) {
      if (record[key] !== undefined) {
        shape.default_value = String(record[key]);
        evidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
          'default_value',
          record[key],
          `${context.basePath}.${key}`,
          0.9
        ));
        break;
      }
    }

    // Extract state_location
    const stateKeys = ['stateLocation', 'state_location', 'storage'];
    for (const key of stateKeys) {
      const val = record[key];
      if (typeof val === 'string' && ['url', 'local', 'global'].includes(val.toLowerCase())) {
        shape.state_location = val.toLowerCase() as FilterCapabilityShape['state_location'];
        evidence.push(FilterCapabilityShapeDefinition.createFoundEvidence(
          'state_location',
          val,
          `${context.basePath}.${key}`,
          1.0
        ));
        break;
      }
    }

    return { shape, evidence };
  }

  /**
   * Search for filter-related structures in nested JSON
   */
  static searchForFilterStructure(
    obj: unknown,
    basePath: string = ''
  ): Array<{ path: string; structure: unknown; score: number }> {
    const results: Array<{ path: string; structure: unknown; score: number }> = [];

    if (!obj || typeof obj !== 'object') return results;

    const record = obj as Record<string, unknown>;

    // Score this object for filter-likelihood
    const score = this.scoreFilterLikelihood(record);
    if (score > 0.3) {
      results.push({ path: basePath || 'root', structure: record, score });
    }

    // Recurse into arrays
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const nested = this.searchForFilterStructure(item, `${basePath}[${index}]`);
        results.push(...nested);
      });
    } else {
      // Recurse into object properties
      for (const [key, value] of Object.entries(record)) {
        if (value && typeof value === 'object') {
          const nested = this.searchForFilterStructure(value, basePath ? `${basePath}.${key}` : key);
          results.push(...nested);
        }
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Score an object for filter-likelihood based on structural properties
   */
  static scoreFilterLikelihood(obj: Record<string, unknown>): number {
    let score = 0;
    const keys = Object.keys(obj).map(k => k.toLowerCase());

    // Key presence scoring
    const filterKeys = ['filter', 'status', 'type', 'category'];
    const valueKeys = ['values', 'options', 'items', 'choices', 'variants'];
    const controlKeys = ['tabs', 'dropdown', 'select', 'buttons'];
    const stateKeys = ['state', 'selected', 'active', 'current'];

    for (const fk of filterKeys) {
      if (keys.some(k => k.includes(fk))) score += 0.2;
    }
    for (const vk of valueKeys) {
      if (keys.some(k => k.includes(vk))) score += 0.15;
    }
    for (const ck of controlKeys) {
      if (keys.some(k => k.includes(ck))) score += 0.15;
    }
    for (const sk of stateKeys) {
      if (keys.some(k => k.includes(sk))) score += 0.1;
    }

    // Array with string values (likely filter options)
    for (const value of Object.values(obj)) {
      if (Array.isArray(value) && value.length >= 2 && value.every(v => typeof v === 'string')) {
        score += 0.2;
        break;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Merge multiple partial shapes into one
   */
  static mergeShapes(shapes: Partial<FilterCapabilityShape>[]): FilterCapabilityShape {
    const merged: FilterCapabilityShape = {};

    for (const shape of shapes) {
      for (const [key, value] of Object.entries(shape)) {
        if (value !== undefined && value !== null) {
          const k = key as keyof FilterCapabilityShape;
          if (merged[k] === undefined) {
            (merged as Record<string, unknown>)[k] = value;
          }
        }
      }
    }

    return merged;
  }
}

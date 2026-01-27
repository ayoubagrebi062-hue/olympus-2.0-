/**
 * Control Tracer
 *
 * Multi-shape tracer for the RICP.
 * Traces all registered shapes through the agent pipeline.
 */

import type {
  ShapeDeclaration,
  ShapeTraceResult,
  ShapeExtractionResult,
  HandoffLossResult,
  SurvivalStatus,
  CapabilityAttribute
} from '../registry/types';
import { ShapeRegistry } from '../registry';
import type { TracedAgentId, HandoffId, LossClass } from '../types';

export class ControlTracer {
  private registry: ShapeRegistry;
  private stageOrder: TracedAgentId[] = ['strategos', 'scope', 'cartographer', 'blocks', 'wire', 'pixel'];
  private handoffIds: HandoffId[] = ['H1', 'H2', 'H3', 'H4', 'H5'] as HandoffId[];

  constructor(registry: ShapeRegistry) {
    this.registry = registry;
  }

  /**
   * Trace all shapes through agent outputs
   */
  traceAll(agentOutputs: Record<TracedAgentId, unknown>): Record<string, ShapeTraceResult> {
    const results: Record<string, ShapeTraceResult> = {};

    for (const shape of this.registry.getAllShapes()) {
      results[shape.id] = this.traceShape(shape, agentOutputs);
    }

    return results;
  }

  /**
   * Trace a single shape through the pipeline
   */
  traceShape(
    shape: ShapeDeclaration,
    agentOutputs: Record<TracedAgentId, unknown>
  ): ShapeTraceResult {
    const extractions: Record<TracedAgentId, ShapeExtractionResult> = {} as Record<TracedAgentId, ShapeExtractionResult>;
    const timestamp = new Date().toISOString();

    // Extract from each agent
    for (const stage of this.stageOrder) {
      const output = agentOutputs[stage];
      extractions[stage] = this.extractFromAgent(shape, stage, output, timestamp);
    }

    // Analyze handoffs
    const handoffLosses: Record<HandoffId, HandoffLossResult> = {} as Record<HandoffId, HandoffLossResult>;

    for (let i = 0; i < this.handoffIds.length; i++) {
      const handoffId = this.handoffIds[i];
      const sourceStage = this.stageOrder[i];
      const targetStage = this.stageOrder[i + 1];

      handoffLosses[handoffId] = this.analyzeHandoff(
        shape,
        handoffId,
        sourceStage,
        targetStage,
        extractions[sourceStage],
        extractions[targetStage]
      );
    }

    // Determine survival status
    const survivalStatus = this.determineSurvivalStatus(shape, extractions, handoffLosses);

    // Calculate RSR for this shape
    const rsr = this.calculateShapeRSR(shape, extractions);

    return {
      shape_id: shape.id,
      category: shape.category,
      extractions,
      handoff_losses: handoffLosses,
      survival_status: survivalStatus,
      rsr
    };
  }

  /**
   * Extract shape from a single agent's output
   */
  private extractFromAgent(
    shape: ShapeDeclaration,
    stage: TracedAgentId,
    output: unknown,
    timestamp: string
  ): ShapeExtractionResult {
    if (!output || typeof output !== 'object') {
      return this.createEmptyExtraction(shape, stage, timestamp);
    }

    const rootPaths = shape.extraction.root_paths[stage] || [];
    const signals = shape.extraction.structural_signals;

    const foundAttributes: CapabilityAttribute[] = [];
    const missingAttributes: CapabilityAttribute[] = [];
    const attributeValues: Record<string, unknown> = {};
    const sourcePaths: Record<string, string> = {};

    // Search for structural signals
    const searchResult = this.searchForShapeSignals(output, rootPaths, signals, shape.attributes.required);

    for (const attr of shape.attributes.required) {
      if (searchResult.found[attr]) {
        foundAttributes.push(attr);
        attributeValues[attr] = searchResult.found[attr].value;
        sourcePaths[attr] = searchResult.found[attr].path;
      } else {
        missingAttributes.push(attr);
      }
    }

    const present = foundAttributes.length > 0;
    const confidence = foundAttributes.length / shape.attributes.required.length;

    return {
      shape_id: shape.id,
      agent_id: stage,
      timestamp,
      present,
      attributes_found: foundAttributes,
      attributes_missing: missingAttributes,
      attribute_values: attributeValues,
      source_paths: sourcePaths,
      confidence
    };
  }

  /**
   * Search for shape signals in agent output
   */
  private searchForShapeSignals(
    output: unknown,
    rootPaths: string[],
    signals: Record<string, unknown>,
    requiredAttrs: CapabilityAttribute[]
  ): { found: Record<string, { value: unknown; path: string }> } {
    const found: Record<string, { value: unknown; path: string }> = {};

    // Deep search helper
    const searchObject = (obj: unknown, path: string, depth: number = 0): void => {
      if (depth > 10 || !obj || typeof obj !== 'object') return;

      const record = obj as Record<string, unknown>;

      for (const [key, value] of Object.entries(record)) {
        const currentPath = path ? `${path}.${key}` : key;

        // Check if key matches any required attribute
        const matchedAttr = this.matchAttributeKey(key, requiredAttrs, signals);
        if (matchedAttr && !found[matchedAttr]) {
          found[matchedAttr] = { value, path: currentPath };
        }

        // Check arrays
        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            searchObject(value[i], `${currentPath}[${i}]`, depth + 1);
          }
        } else if (value && typeof value === 'object') {
          searchObject(value, currentPath, depth + 1);
        }
      }
    };

    searchObject(output, '');

    return { found };
  }

  /**
   * Match a key to a required attribute using structural signals
   */
  private matchAttributeKey(
    key: string,
    requiredAttrs: CapabilityAttribute[],
    signals: Record<string, unknown>
  ): CapabilityAttribute | null {
    const keyLower = key.toLowerCase();

    // Direct attribute name match
    for (const attr of requiredAttrs) {
      if (keyLower === attr.toLowerCase() || keyLower === attr.replace(/_/g, '').toLowerCase()) {
        return attr;
      }
    }

    // Signal-based matching
    const featureKeywords = (signals.feature_keywords as string[]) || [];
    const componentTypes = (signals.component_types as string[]) || [];
    const statePatterns = (signals.state_patterns as string[]) || [];
    const handlerPatterns = (signals.handler_patterns as string[]) || [];
    const layoutPatterns = (signals.layout_patterns as string[]) || [];

    // Match specific patterns to attributes
    if (featureKeywords.some(kw => keyLower.includes(kw.toLowerCase()))) {
      if (requiredAttrs.includes('filter_attribute')) return 'filter_attribute';
      if (requiredAttrs.includes('target_entity')) return 'target_entity';
    }

    if (componentTypes.some(ct => keyLower.includes(ct.toLowerCase()))) {
      if (requiredAttrs.includes('ui_control')) return 'ui_control';
      if (requiredAttrs.includes('layout_type')) return 'layout_type';
    }

    if (statePatterns.some(sp => keyLower.includes(sp.toLowerCase()))) {
      if (requiredAttrs.includes('state_hook')) return 'state_hook';
      if (requiredAttrs.includes('page_state_hook')) return 'page_state_hook';
    }

    if (handlerPatterns.some(hp => keyLower.includes(hp.toLowerCase()))) {
      if (requiredAttrs.includes('event_handler')) return 'event_handler';
      if (requiredAttrs.includes('navigation_handler')) return 'navigation_handler';
    }

    if (layoutPatterns.some(lp => keyLower.includes(lp.toLowerCase()))) {
      if (requiredAttrs.includes('layout_type')) return 'layout_type';
    }

    // Special matches
    if (keyLower === 'name' || keyLower === 'entity' || keyLower === 'resource') {
      if (requiredAttrs.includes('target_entity')) return 'target_entity';
    }

    if (keyLower === 'variants' || keyLower === 'options' || keyLower === 'values') {
      if (requiredAttrs.includes('filter_values')) return 'filter_values';
    }

    if (keyLower === 'fields' || keyLower === 'columns' || keyLower === 'displayfields') {
      if (requiredAttrs.includes('display_fields')) return 'display_fields';
    }

    if (keyLower === 'pagesize' || keyLower === 'limit' || keyLower === 'perpage') {
      if (requiredAttrs.includes('page_size')) return 'page_size';
    }

    if (keyLower === 'total' || keyLower === 'count' || keyLower === 'totalcount') {
      if (requiredAttrs.includes('total_indicator')) return 'total_indicator';
    }

    return null;
  }

  /**
   * Analyze a single handoff for losses
   */
  private analyzeHandoff(
    shape: ShapeDeclaration,
    handoffId: HandoffId,
    sourceStage: TracedAgentId,
    targetStage: TracedAgentId,
    sourceExtraction: ShapeExtractionResult,
    targetExtraction: ShapeExtractionResult
  ): HandoffLossResult {
    const attributesLost: CapabilityAttribute[] = [];
    const attributesDegraded: CapabilityAttribute[] = [];

    // Find attributes lost between stages
    for (const attr of sourceExtraction.attributes_found) {
      if (!targetExtraction.attributes_found.includes(attr)) {
        attributesLost.push(attr);
      }
    }

    // Determine loss class
    let lossClass: LossClass | null = null;
    const lossDetected = attributesLost.length > 0 ||
      (sourceExtraction.present && !targetExtraction.present);

    if (sourceExtraction.present && !targetExtraction.present) {
      lossClass = 'L0_TOTAL_OMISSION';
    } else if (attributesLost.length > 0) {
      lossClass = 'L1_PARTIAL_CAPTURE';
    }

    // Determine budget status
    let budgetStatus: 'WITHIN' | 'EXCEEDED' | 'FATAL' = 'WITHIN';
    if (lossClass) {
      const isFatal = this.registry.isFatalLoss(handoffId, shape.category, lossClass);
      const isTolerated = this.registry.isToleratedLoss(handoffId, shape.category, lossClass);

      if (isFatal) {
        budgetStatus = 'FATAL';
      } else if (!isTolerated) {
        budgetStatus = 'EXCEEDED';
      }
    }

    return {
      handoff_id: handoffId,
      source_agent: sourceStage,
      target_agent: targetStage,
      loss_detected: lossDetected,
      loss_class: lossClass,
      attributes_lost: attributesLost,
      attributes_degraded: attributesDegraded,
      budget_status: budgetStatus
    };
  }

  /**
   * Determine overall survival status
   */
  private determineSurvivalStatus(
    shape: ShapeDeclaration,
    extractions: Record<TracedAgentId, ShapeExtractionResult>,
    handoffLosses: Record<HandoffId, HandoffLossResult>
  ): SurvivalStatus {
    const targetStage = shape.survival.must_reach_stage;
    const targetIdx = this.stageOrder.indexOf(targetStage);

    // Find last stage where shape was present
    let lastPresentStage: TracedAgentId | null = null;
    for (let i = this.stageOrder.length - 1; i >= 0; i--) {
      if (extractions[this.stageOrder[i]].present) {
        lastPresentStage = this.stageOrder[i];
        break;
      }
    }

    // Check if survived to target
    const targetExtraction = extractions[targetStage];
    const survivedToTarget = targetExtraction.present;

    // Find failure point
    let failurePoint: HandoffId | null = null;
    let failureClass: LossClass | null = null;

    if (!survivedToTarget) {
      for (const handoffId of this.handoffIds) {
        const handoff = handoffLosses[handoffId];
        if (handoff.loss_class) {
          failurePoint = handoffId;
          failureClass = handoff.loss_class;
          break;
        }
      }
    }

    return {
      survived_to_target: survivedToTarget,
      target_stage: targetStage,
      actual_last_stage: lastPresentStage,
      failure_point: failurePoint,
      failure_class: failureClass
    };
  }

  /**
   * Calculate RSR for a shape
   */
  private calculateShapeRSR(
    shape: ShapeDeclaration,
    extractions: Record<TracedAgentId, ShapeExtractionResult>
  ): number {
    // RSR = attributes at PIXEL / attributes at STRATEGOS
    const strategosExtraction = extractions['strategos'];
    const pixelExtraction = extractions['pixel'];

    const strategosCount = strategosExtraction.attributes_found.length || shape.attributes.required.length;
    const pixelCount = pixelExtraction.attributes_found.length;

    if (strategosCount === 0) return 0;
    return pixelCount / strategosCount;
  }

  private createEmptyExtraction(
    shape: ShapeDeclaration,
    stage: TracedAgentId,
    timestamp: string
  ): ShapeExtractionResult {
    return {
      shape_id: shape.id,
      agent_id: stage,
      timestamp,
      present: false,
      attributes_found: [],
      attributes_missing: shape.attributes.required,
      attribute_values: {},
      source_paths: {},
      confidence: 0
    };
  }
}

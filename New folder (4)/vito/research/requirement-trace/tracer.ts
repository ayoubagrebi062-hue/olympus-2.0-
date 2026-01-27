/**
 * Requirement Tracer
 *
 * Main orchestration for tracing FilterCapabilityShape across the agent pipeline.
 * Coordinates extraction, diffing, and loss classification.
 */

import type {
  TraceReport,
  TraceChainLink,
  TracedAgentId,
  HandoffId,
  ExtractionResult,
  Handoff,
  TraceConfig
} from './types';
import { getExtractor } from './extractors';
import { ContextExtractor } from './extractors/context-extractor';
import { HandoffAnalyzer } from './analyzers/handoff-analyzer';
import { FilterCapabilityShapeDefinition } from './shapes/filter-capability';

export interface TraceInput {
  // Agent outputs keyed by agent ID
  agentOutputs: Record<TracedAgentId, unknown>;

  // Optional: simulated context summaries
  contextSummaries?: Record<TracedAgentId, string>;

  // Config
  config: TraceConfig;
}

export class Tracer {
  private contextExtractor = new ContextExtractor();
  private handoffAnalyzer = new HandoffAnalyzer();

  /**
   * Execute full trace across the agent pipeline
   */
  trace(input: TraceInput): TraceReport {
    const { agentOutputs, contextSummaries, config } = input;
    const timestamp = new Date().toISOString();

    // Step 1: Extract shapes from each agent output
    const extractions: Record<TracedAgentId, ExtractionResult> = {} as Record<TracedAgentId, ExtractionResult>;

    for (const agentId of config.agent_sequence) {
      const agentOutput = agentOutputs[agentId];
      const extractor = getExtractor(agentId);

      if (!agentOutput) {
        // Agent output not provided - create failed extraction
        extractions[agentId] = {
          agent_id: agentId,
          timestamp,
          shape: null,
          attribute_evidence: [],
          source_file: `agentOutputs.${agentId}`,
          source_type: 'agent_output',
          status: 'FAILED',
          extraction_errors: [`No output provided for agent ${agentId}`]
        };
      } else {
        extractions[agentId] = extractor.extract(agentOutput, `agentOutputs.${agentId}`);
      }
    }

    // Step 2: Analyze each handoff
    const handoffs: Record<HandoffId, Handoff> = {} as Record<HandoffId, Handoff>;

    for (const handoffDef of config.handoffs) {
      const sourceAgent = handoffDef.source as TracedAgentId;
      const targetAgent = handoffDef.target as TracedAgentId;

      const sourceExtraction = extractions[sourceAgent];
      const targetExtraction = extractions[targetAgent];

      // Extract from context summary if available
      let contextExtraction: ExtractionResult | null = null;
      if (contextSummaries?.[targetAgent]) {
        contextExtraction = this.contextExtractor.extractFromContextSummary(
          contextSummaries[targetAgent],
          targetAgent,
          `contextSummaries.${targetAgent}`
        );
      }

      // Simulate dependency summary extraction
      let dependencyExtraction: ExtractionResult | null = null;
      if (sourceExtraction.shape) {
        // Simulate what summarizeOutputForDependency would produce
        const simulatedSummary = this.contextExtractor.simulateSummary(agentOutputs[sourceAgent]);
        dependencyExtraction = this.contextExtractor.extractFromDependencySummary(
          simulatedSummary,
          sourceAgent,
          targetAgent,
          `dependencySummary.${sourceAgent}->${targetAgent}`
        );
      }

      handoffs[handoffDef.id as HandoffId] = this.handoffAnalyzer.analyzeHandoff(
        handoffDef.id as HandoffId,
        sourceAgent,
        targetAgent,
        sourceExtraction,
        targetExtraction,
        contextExtraction,
        dependencyExtraction
      );
    }

    // Step 3: Build trace chain
    const traceChain = this.buildTraceChain(config.agent_sequence, extractions, handoffs);

    // Step 4: Identify the loss point
    const lossPoint = this.identifyLossPoint(Object.values(handoffs), extractions);

    return {
      metadata: {
        generated_at: timestamp,
        tool_version: '1.0.0',
        target_shape: 'FilterCapabilityShape',
        agents_traced: config.agent_sequence
      },
      extractions,
      handoffs,
      loss_point: lossPoint,
      trace_chain: traceChain
    };
  }

  /**
   * Build the trace chain showing shape presence at each stage
   */
  private buildTraceChain(
    agentSequence: TracedAgentId[],
    extractions: Record<TracedAgentId, ExtractionResult>,
    handoffs: Record<HandoffId, Handoff>
  ): TraceChainLink[] {
    const chain: TraceChainLink[] = [];
    const handoffList = Object.values(handoffs);

    for (let i = 0; i < agentSequence.length; i++) {
      const agent = agentSequence[i];
      const extraction = extractions[agent];

      const presentAttrs = extraction.attribute_evidence
        .filter(e => e.found)
        .map(e => e.attribute);

      const missingAttrs = extraction.attribute_evidence
        .filter(e => !e.found)
        .map(e => e.attribute);

      // Find loss from previous agent
      let lossFromPrevious = null;
      if (i > 0) {
        const prevAgent = agentSequence[i - 1];
        const handoff = handoffList.find(h =>
          h.source_agent === prevAgent && h.target_agent === agent
        );
        if (handoff?.loss) {
          lossFromPrevious = handoff.loss.loss_class;
        }
      }

      chain.push({
        agent,
        shape_present: extraction.shape !== null,
        attributes_present: presentAttrs,
        attributes_missing: missingAttrs,
        loss_from_previous: lossFromPrevious
      });
    }

    return chain;
  }

  /**
   * Identify the primary loss point
   */
  private identifyLossPoint(
    handoffs: Handoff[],
    extractions: Record<TracedAgentId, ExtractionResult>
  ): TraceReport['loss_point'] {
    // First, find the first handoff with a loss
    const firstLoss = this.handoffAnalyzer.findFirstLoss(handoffs);

    if (firstLoss) {
      return {
        identified: true,
        handoff_id: firstLoss.id,
        loss_class: firstLoss.loss!.loss_class,
        evidence: firstLoss.loss!.evidence,
        summary: this.generateLossSummary(firstLoss)
      };
    }

    // Check if shape was never present
    const anyShapeFound = Object.values(extractions).some(e => e.shape !== null);
    if (!anyShapeFound) {
      return {
        identified: true,
        handoff_id: null,
        loss_class: 'L0_TOTAL_OMISSION',
        evidence: {
          source_path: 'ALL_AGENTS',
          target_path: 'ALL_AGENTS',
          source_value: null,
          target_value: null,
          explanation: 'FilterCapabilityShape was not found in any agent output. ' +
            'The requirement may not have been captured in the initial prompt or ' +
            'the extraction patterns need adjustment.'
        },
        summary: 'COMPLETE ABSENCE: Filter capability shape not found in any agent output.'
      };
    }

    // Shape was found somewhere but no classified loss
    return {
      identified: false,
      handoff_id: null,
      loss_class: null,
      evidence: null,
      summary: 'No loss detected. Filter capability appears to propagate correctly, ' +
        'or the loss occurs outside the traced handoffs.'
    };
  }

  /**
   * Generate human-readable loss summary
   */
  private generateLossSummary(handoff: Handoff): string {
    const loss = handoff.loss!;
    const parts = [
      `LOSS IDENTIFIED at handoff ${handoff.id}: ${handoff.source_agent} → ${handoff.target_agent}`,
      `Loss Class: ${loss.loss_class} (${loss.severity})`,
      `Condition: ${loss.triggering_condition}`,
      `Evidence: ${loss.evidence.explanation}`
    ];

    if (handoff.attributes_lost > 0) {
      const lostAttrs = handoff.attribute_diffs
        .filter(d => d.status === 'MISSING')
        .map(d => d.attribute);
      parts.push(`Lost Attributes: ${lostAttrs.join(', ')}`);
    }

    return parts.join('\n');
  }
}
